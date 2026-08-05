import { paymentsRepository } from './payments.repository.js';
import { bookingsRepository } from '../bookings/bookings.repository.js';
import { initiateStkPush } from '../../lib/mpesa.js';
import { logger } from '../../lib/logger.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';

export const paymentsService = {
  async initiateForBooking(bookingId: string, phone: string, amount: number) {
    const payment = await paymentsRepository.create({
      bookingId,
      method: 'MPESA',
      amount,
      mpesaPhone: phone,
    });

    try {
      const stkResult = await initiateStkPush({
        phone,
        amount,
        accountReference: `CHAPCHAP-${bookingId.slice(0, 8)}`,
        transactionDesc: 'Delivery payment',
      });

      await paymentsRepository.setStkDetails(payment.id, {
        checkoutRequestId: stkResult.checkoutRequestId,
        merchantRequestId: stkResult.merchantRequestId,
      });

      return { paymentId: payment.id, customerMessage: stkResult.customerMessage };
    } catch (err) {
      // STK push failed to even initiate — mark payment failed and cancel booking immediately
      // so the customer isn't left with a booking stuck in AWAITING_PAYMENT forever
      await paymentsRepository.markResult(payment.id, 'FAILED', {
        failureReason: err instanceof Error ? err.message : 'Unknown error',
      });
      await bookingsRepository.updateStatus(bookingId, 'CANCELLED', 'Payment initiation failed');
      throw new BadRequestError('Could not initiate M-Pesa payment. Please try again.');
    }
  },

  /**
   * Called by Safaricom's servers — this is the source of truth for payment outcome.
   * The initial initiateStkPush response only confirms Safaricom received the request;
   * this callback is the only place we learn if the customer actually approved it.
   */
  async handleMpesaCallback(body: unknown) {
    const stkCallback = (body as any)?.Body?.stkCallback;
    if (!stkCallback) {
      logger.warn({ body }, 'Received malformed M-Pesa callback');
      return;
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID as string;
    const resultCode = stkCallback.ResultCode as number;
    const resultDesc = stkCallback.ResultDesc as string;

    const payment = await paymentsRepository.findByCheckoutRequestId(checkoutRequestId);
    if (!payment) {
      logger.warn({ checkoutRequestId }, 'Callback received for unknown payment');
      return;
    }

    // Idempotency guard — Safaricom sometimes retries callbacks if we don't respond fast enough
    if (payment.status !== 'PENDING') {
      logger.info({ checkoutRequestId }, 'Callback for already-processed payment, ignoring');
      return;
    }

    if (resultCode === 0) {
      // Success — extract the M-Pesa receipt number from the metadata array
      const items: Array<{ Name: string; Value: unknown }> =
        stkCallback.CallbackMetadata?.Item ?? [];
      const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value as
        | string
        | undefined;

      await paymentsRepository.markResult(payment.id, 'SUCCESS', { mpesaReceiptNumber: receipt });
      // Move booking from AWAITING_PAYMENT → PENDING so dispatch can now assign a rider
      await bookingsRepository.updateStatus(payment.bookingId, 'PENDING', 'Payment confirmed');
      logger.info({ bookingId: payment.bookingId, receipt }, 'Payment succeeded');
    } else {
      // Could be user cancelled, insufficient funds, STK timeout, etc.
      await paymentsRepository.markResult(payment.id, 'FAILED', { failureReason: resultDesc });
      await bookingsRepository.updateStatus(
        payment.bookingId,
        'CANCELLED',
        `Payment failed: ${resultDesc}`,
      );
      logger.info({ bookingId: payment.bookingId, resultDesc }, 'Payment failed');
    }
  },

  async getStatus(bookingId: string) {
    const payment = await paymentsRepository.findByBookingId(bookingId);
    if (!payment) {
      throw new NotFoundError('No payment found for this booking');
    }
    return payment;
  },
};

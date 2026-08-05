import { env } from '../config/env.js';
import { logger } from './logger.js';

const BASE_URL =
  env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

// --- OAuth token caching ---
// Daraja tokens are valid for ~1 hour; re-fetching on every request risks rate-limiting
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(
    `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`,
  ).toString('base64');

  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) {
    logger.error({ status: res.status }, 'Failed to obtain M-Pesa access token');
    throw new Error('Could not authenticate with M-Pesa');
  }

  const data = (await res.json()) as { access_token: string; expires_in: string };

  cachedToken = {
    token: data.access_token,
    // Refresh 60s early to avoid edge-case expiry mid-request
    expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
  };

  return cachedToken.token;
}

function generateTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function generatePassword(timestamp: string): string {
  // Daraja-specific auth: base64(Shortcode + Passkey + Timestamp), regenerated per request
  const raw = `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(raw).toString('base64');
}

/**
 * Normalizes any Kenyan phone format to 254XXXXXXXXX (what Daraja requires).
 * Accepts: 07XXXXXXXX, 7XXXXXXXX, +254XXXXXXXXX, 254XXXXXXXXX
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('1')) return `254${digits}`;
  throw new Error(`Cannot normalize phone number: ${phone}`);
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  customerMessage: string;
}

export async function initiateStkPush(params: {
  phone: string;
  amount: number;
  accountReference: string; // what shows on customer's phone, e.g. "CHAPCHAP-abc12345"
  transactionDesc: string;
}): Promise<StkPushResult> {
  const token = await getAccessToken();
  const timestamp = generateTimestamp();
  const password = generatePassword(timestamp);
  const normalizedPhone = normalizePhone(params.phone);

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(params.amount),
      PartyA: normalizedPhone,
      PartyB: env.MPESA_SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: env.MPESA_CALLBACK_URL,
      AccountReference: params.accountReference,
      TransactionDesc: params.transactionDesc,
    }),
  });

  const data = await res.json();

  if (!res.ok || (data as any).ResponseCode !== '0') {
    logger.error({ data }, 'STK push request failed');
    throw new Error((data as any).errorMessage ?? 'Failed to initiate M-Pesa payment');
  }

  return {
    merchantRequestId: (data as any).MerchantRequestID,
    checkoutRequestId: (data as any).CheckoutRequestID,
    responseCode: (data as any).ResponseCode,
    customerMessage: (data as any).CustomerMessage,
  };
}

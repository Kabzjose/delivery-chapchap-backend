import pino from 'pino';

/**
 * Application-wide structured logger backed by Pino.
 *
 * - In development: pretty-prints logs with colour and readable timestamps.
 * - In production: emits newline-delimited JSON — easy to ship to log aggregators
 *   like Datadog, Loki, or CloudWatch without any extra parsing.
 *
 * Import this wherever you need to log; never use console.log in application code.
 */
export const logger = pino(
  process.env.NODE_ENV === 'production'
    ? { level: 'info' }
    : {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      },
);

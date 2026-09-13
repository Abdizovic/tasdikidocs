import winston from "winston";

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const isProduction = process.env.NODE_ENV === "production";

const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${ts}] ${level}: ${stack ?? message}${metaStr}`;
  })
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

/**
 * Singleton winston logger. Use this everywhere instead of console.log so
 * log output is consistently formatted (pretty + colorized in development,
 * structured JSON in production) and can later be shipped to a log
 * aggregator without touching call sites.
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  format: isProduction ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

export default logger;

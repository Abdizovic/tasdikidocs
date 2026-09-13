import rateLimit from "express-rate-limit";

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const MAX = Number(process.env.RATE_LIMIT_MAX) || 100;

/**
 * General-purpose API rate limiter, applied to the whole /api/v1 surface.
 */
export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many requests, please try again later.",
      code: "RATE_LIMITED",
    },
  },
});

/**
 * Stricter limiter for OTP request/verify routes (forgot-password,
 * verify-otp, reset-password) to prevent brute-force guessing of OTP codes
 * and to stop the reset-request endpoint from being used as a mail bomb.
 */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many attempts. Please try again in 15 minutes.",
      code: "OTP_RATE_LIMITED",
    },
  },
});

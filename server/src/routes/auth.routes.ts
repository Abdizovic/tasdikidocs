import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { otpLimiter } from "../middleware/rateLimiter";
import * as authService from "../services/authService";

const router = Router();

const forgotPasswordSchema = z.object({
  email: z.string().email("A valid email is required"),
});

const verifyOtpSchema = z.object({
  email: z.string().email("A valid email is required"),
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be numeric"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("A valid email is required"),
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be numeric"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/v1/auth/forgot-password
 * Public. Rate-limited to prevent using this as a mail bomb / enumeration
 * vector. Always returns a generic success message.
 */
router.post("/forgot-password", otpLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body as z.infer<typeof forgotPasswordSchema>;
    const result = await authService.requestPasswordResetOtp(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/verify-otp
 * Public. Rate-limited to blunt brute-force guessing of the 6-digit code.
 */
router.post("/verify-otp", otpLimiter, validate(verifyOtpSchema), async (req, res, next) => {
  try {
    const { email, code } = req.body as z.infer<typeof verifyOtpSchema>;
    const result = await authService.verifyOtp(email, code);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/reset-password
 * Public (identity is proven via the emailed OTP code, not a session).
 * Rate-limited for the same reasons as above.
 */
router.post("/reset-password", otpLimiter, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body as z.infer<typeof resetPasswordSchema>;
    const result = await authService.resetPassword(email, code, newPassword);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

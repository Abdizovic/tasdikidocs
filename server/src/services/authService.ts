import bcrypt from "bcryptjs";
import { ApiError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { supabaseAdmin } from "../lib/supabase";
import { sendMail } from "../lib/mailer";
import { OtpCode, Profile } from "../types/domain";
import * as auditLogService from "./auditLogService";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

function generateNumericCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function findProfileByEmail(email: string): Promise<Profile | undefined> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile) ?? undefined;
}

export async function findProfileById(id: string): Promise<Profile | undefined> {
  const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile) ?? undefined;
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

/**
 * requestPasswordResetOtp
 * Generates and emails a one-time code for password reset. Always returns
 * a generic success message (does not reveal whether the email exists) to
 * avoid user enumeration.
 */
export async function requestPasswordResetOtp(email: string): Promise<{ message: string }> {
  const profile = await findProfileByEmail(email);

  if (profile) {
    const code = generateNumericCode();
    const codeHash = await bcrypt.hash(code, 10);

    const { data: otp, error } = await supabaseAdmin
      .from("otp_codes")
      .insert({
        user_id: profile.id,
        code_hash: codeHash,
        purpose: "password_reset",
        expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    try {
      await sendMail({
        to: email,
        subject: "Your TasdikiDocs password reset code",
        text: `Your verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
        html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p><p>If you didn't request this, you can ignore this email.</p>`,
      });
    } catch (err) {
      logger.error("failed to send password reset email", { error: (err as Error).message, email });
    }

    await auditLogService.record({
      actorId: profile.id,
      action: "auth.password_reset_requested",
      targetTable: "otp_codes",
      targetId: otp.id,
      metadata: { email },
    });
  } else {
    logger.warn(`Password reset requested for unknown email: ${email}`);
  }

  return { message: "If an account exists for that email, a verification code has been sent." };
}

async function getActiveOtp(userId: string): Promise<OtpCode | undefined> {
  const { data, error } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("user_id", userId)
    .eq("purpose", "password_reset")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as OtpCode) ?? undefined;
}

/**
 * verifyOtp
 * Validates a submitted code against the most recent outstanding OTP for
 * the user, recording the attempt regardless of outcome. Throws ApiError on
 * any failure.
 */
export async function verifyOtp(email: string, code: string): Promise<{ valid: true }> {
  const profile = await findProfileByEmail(email);
  if (!profile) {
    throw ApiError.badRequest("Invalid or expired code", "OTP_INVALID");
  }

  const otp = await getActiveOtp(profile.id);
  if (!otp) {
    throw ApiError.badRequest("Invalid or expired code", "OTP_INVALID");
  }

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    throw ApiError.badRequest("Code has expired. Please request a new one.", "OTP_EXPIRED");
  }

  if (otp.attempt_count >= MAX_OTP_ATTEMPTS) {
    throw ApiError.badRequest("Too many attempts. Please request a new code.", "OTP_LOCKED");
  }

  const { error: attemptError } = await supabaseAdmin
    .from("otp_codes")
    .update({ attempt_count: otp.attempt_count + 1 })
    .eq("id", otp.id);
  if (attemptError) throw new Error(attemptError.message);

  const matches = await bcrypt.compare(code, otp.code_hash);
  if (!matches) {
    throw ApiError.badRequest("Invalid or expired code", "OTP_INVALID");
  }

  return { valid: true };
}

/**
 * resetPassword
 * Re-validates the OTP, then updates the user's real Supabase Auth password
 * and consumes the code so it cannot be reused.
 */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
  const profile = await findProfileByEmail(email);
  if (!profile) {
    throw ApiError.badRequest("Invalid or expired code", "OTP_INVALID");
  }

  // Re-validate.
  await verifyOtp(email, code);

  const otp = await getActiveOtp(profile.id);
  if (!otp) {
    throw ApiError.badRequest("Invalid or expired code", "OTP_INVALID");
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });
  if (updateError) throw new Error(updateError.message);

  const { error: consumeError } = await supabaseAdmin
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id);
  if (consumeError) throw new Error(consumeError.message);

  await auditLogService.record({
    actorId: profile.id,
    action: "auth.password_reset_completed",
    targetTable: "profiles",
    targetId: profile.id,
    metadata: {},
  });

  logger.info(`Password reset completed for ${email}`);

  return { message: "Password has been reset successfully." };
}

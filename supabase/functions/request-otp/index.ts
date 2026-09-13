// TasdikiDocs — request-otp / verify-otp edge function (STUB)
//
// Backs the "forgot password" flow. Generates a 6-digit OTP, stores only
// its hash in otp_codes (never the raw code), and emails it to the user.
// A second action verifies the submitted code against the stored hash and,
// on success, updates the user's password via the Admin API.
//
// TODO (real-integration phase):
//   1. Deploy with `supabase functions deploy request-otp`.
//   2. Wire an actual email provider (Resend/SendGrid/Postmark) — the
//      `sendOtpEmail()` stub below just logs for now.
//   3. Rate-limit at the edge (or rely on the Express layer's otpLimiter
//      in server/src/middleware/rateLimiter.ts) to prevent OTP spam.
//   4. Enforce max attempt_count (e.g. 5) before invalidating a code.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();

    if (url.pathname.endsWith("/request")) {
      const { email } = body as { email: string };

      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      // Always return a generic success message even if the email doesn't
      // exist, so this endpoint can't be used to enumerate registered users.
      if (!profile) return json({ message: "If that email exists, a code was sent." }, 200);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await sha256(code);
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

      await adminClient.from("otp_codes").insert({
        user_id: profile.id,
        code_hash: codeHash,
        purpose: "password_reset",
        expires_at: expiresAt,
      });

      await sendOtpEmail(email, code);

      return json({ message: "If that email exists, a code was sent." }, 200);
    }

    if (url.pathname.endsWith("/verify")) {
      const { email, code, newPassword } = body as {
        email: string;
        code: string;
        newPassword: string;
      };

      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (!profile) return json({ error: "Invalid or expired code" }, 400);

      const { data: otpRow } = await adminClient
        .from("otp_codes")
        .select("*")
        .eq("user_id", profile.id)
        .eq("purpose", "password_reset")
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!otpRow || new Date(otpRow.expires_at) < new Date() || otpRow.attempt_count >= MAX_ATTEMPTS) {
        return json({ error: "Invalid or expired code" }, 400);
      }

      const codeHash = await sha256(code);
      if (codeHash !== otpRow.code_hash) {
        await adminClient
          .from("otp_codes")
          .update({ attempt_count: otpRow.attempt_count + 1 })
          .eq("id", otpRow.id);
        return json({ error: "Invalid or expired code" }, 400);
      }

      await adminClient.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);
      await adminClient.auth.admin.updateUserById(profile.id, { password: newPassword });

      return json({ message: "Password updated" }, 200);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  console.log(`[request-otp] would email ${email} code ${code}`);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

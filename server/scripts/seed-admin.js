// Creates the single platform admin account, per supabase/seed_admin.sql.
// There is NO signup path for admin anywhere in the app, by design — this
// script (or the equivalent manual dashboard steps documented in that file)
// is the only way an admin account is ever created.
//
// Usage: node scripts/seed-admin.js <email> [password]
// If password is omitted, a strong one is generated and printed once.
require("dotenv").config();
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*-_=+";
  const all = upper + lower + digits + special;

  const pick = (chars) => chars[crypto.randomInt(chars.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const rest = Array.from({ length: 12 }, () => pick(all));

  return [...required, ...rest].sort(() => crypto.randomInt(3) - 1).join("");
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3] || generatePassword();

  if (!email) {
    console.error("Usage: node scripts/seed-admin.js <email> [password]");
    process.exit(1);
  }

  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "System Admin" },
  });

  if (userError || !userData.user) {
    console.error("Failed to create auth user:", userError?.message);
    process.exit(1);
  }

  // handle_new_user always creates the profile with role = 'verifier' (it
  // never grants admin from client metadata) — promote it here, which only
  // succeeds because this runs with the service_role key.
  const { data: profile, error: promoteError } = await supabaseAdmin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userData.user.id)
    .select()
    .single();

  if (promoteError) {
    console.error("Failed to promote to admin:", promoteError.message);
    process.exit(1);
  }

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: profile.id,
    action: "admin_account_seeded",
    target_table: "profiles",
    target_id: profile.id,
    metadata: { email: profile.email },
  });

  console.log("Admin account created:");
  console.log(`  email:    ${profile.email}`);
  console.log(`  password: ${password}`);
  console.log(`  role:     ${profile.role}`);
  console.log("\nChange this password after first login.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// TasdikiDocs — approve-institution edge function (STUB)
//
// This is the ONLY sanctioned way an institution's status ever moves to
// 'approved' / 'rejected' / 'suspended'. It runs with the service role key,
// which is what lets it bypass the `prevent_protected_field_change` trigger
// guard defined in migrations/0001_init.sql. It must never be callable by
// anything other than an authenticated admin — this is the protected
// admin-only action the spec requires instead of a direct client DB write.
//
// TODO (real-integration phase):
//   1. Deploy with `supabase functions deploy approve-institution`.
//   2. Verify the caller's JWT and confirm profiles.role = 'admin' before
//      doing anything (see requireAdmin() below).
//   3. Perform the update using the service-role Supabase client.
//   4. Insert a row into audit_logs recording who approved/rejected/
//      suspended which institution and why.
//   5. If approving, this is also the point where a Thirdweb wallet /
//      ISSUER_ROLE grant on CertificateRegistry.sol should be triggered
//      for the institution's wallet_address (see contracts/README.md).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Action = "approve" | "reject" | "suspend";

interface RequestBody {
  institutionId: string;
  action: Action;
  reason?: string;
}

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client scoped to the caller's own JWT, used only to check who they are.
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await callerClient.auth.getUser();

    if (!user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return json({ error: "Forbidden — admin only" }, 403);
    }

    const body = (await req.json()) as RequestBody;
    if (!body.institutionId || !["approve", "reject", "suspend"].includes(body.action)) {
      return json({ error: "institutionId and a valid action are required" }, 400);
    }

    const statusByAction: Record<Action, string> = {
      approve: "approved",
      reject: "rejected",
      suspend: "suspended",
    };

    // Service-role client bypasses RLS/trigger guard — this is the one
    // legitimate path for changing institution status.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: updated, error } = await adminClient
      .from("institutions")
      .update({
        status: statusByAction[body.action],
        rejection_reason: body.action === "reject" ? body.reason ?? null : null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", body.institutionId)
      .select()
      .single();

    if (error) {
      return json({ error: error.message }, 500);
    }

    await adminClient.from("audit_logs").insert({
      actor_id: user.id,
      action: `institution_${body.action}`,
      target_table: "institutions",
      target_id: body.institutionId,
      metadata: { reason: body.reason ?? null },
    });

    return json({ institution: updated }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

import { afterAll, beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { supabaseAdmin } from "../lib/supabase";

const app = createApp();

const EXISTING_REG_NUMBER = `TEST/CS/2026/${Date.now()}`;
const NON_EXISTENT_ID = "does-not-exist-12345";

// This suite runs against the real Supabase project, so the fixture
// certificate it verifies against is created here (and torn down after)
// rather than relying on any hardcoded seed data.
let testUserId: string | undefined;
let testInstitutionId: string | undefined;
let testCertificateId: string | undefined;

beforeAll(async () => {
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: `test-fixture-${Date.now()}@tasdikidocs.test`,
    password: "TestFixture123!",
    email_confirm: true,
    user_metadata: { role: "institution", full_name: "Test Fixture Institution" },
  });
  if (userError || !userData.user) throw userError ?? new Error("failed to create test fixture user");
  testUserId = userData.user.id;

  const { data: institution, error: institutionError } = await supabaseAdmin
    .from("institutions")
    .insert({
      profile_id: testUserId,
      institution_name: "Test Fixture University",
      registration_number: `TEST-INST-${Date.now()}`,
      country: "Kenya",
      status: "approved",
    })
    .select()
    .single();
  if (institutionError) throw new Error(institutionError.message);
  testInstitutionId = institution.id;

  const { data: certificate, error: certificateError } = await supabaseAdmin
    .from("certificates")
    .insert({
      institution_id: testInstitutionId,
      student_name: "Test Student",
      registration_number: EXISTING_REG_NUMBER,
      course_name: "BSc. Testing",
      grade: "A",
      issue_date: "2026-01-01",
      certificate_hash: `test-hash-${Date.now()}`,
      status: "active",
    })
    .select()
    .single();
  if (certificateError) throw new Error(certificateError.message);
  testCertificateId = certificate.id;
});

afterAll(async () => {
  if (testCertificateId) await supabaseAdmin.from("certificates").delete().eq("id", testCertificateId);
  if (testInstitutionId) await supabaseAdmin.from("institutions").delete().eq("id", testInstitutionId);
  if (testUserId) await supabaseAdmin.auth.admin.deleteUser(testUserId);
});

describe("GET /api/v1/certificates/verify/:idOrRegNumber", () => {
  it("returns a structured 'valid' response for an existing certificate", async () => {
    const res = await request(app).get(`/api/v1/certificates/verify/${encodeURIComponent(EXISTING_REG_NUMBER)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result", "valid");
    expect(res.body.certificate).toBeTruthy();
    expect(res.body.certificate).toMatchObject({
      registration_number: EXISTING_REG_NUMBER,
      status: "active",
    });
    expect(res.headers["cache-control"]).toBe("public, max-age=30");
  });

  it("returns a structured 'not_found' response for a non-existing certificate", async () => {
    const res = await request(app).get(`/api/v1/certificates/verify/${NON_EXISTENT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result", "not_found");
    expect(res.body.certificate).toBeNull();
  });
});

describe("POST /api/v1/certificates (institution-only)", () => {
  it("403s when the authenticated caller does not have the institution role", async () => {
    const res = await request(app)
      .post("/api/v1/certificates")
      .set("x-mock-user-id", "00000000-0000-4000-8000-000000000003")
      .set("x-mock-role", "verifier")
      .send({
        student_name: "Test Student",
        registration_number: "TEST/0001",
        course_name: "BSc. Testing",
        grade: "A",
        issue_date: "2026-01-01",
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
  });

  it("401s when no authentication is provided at all", async () => {
    const res = await request(app).post("/api/v1/certificates").send({});
    expect(res.status).toBe(401);
  });
});

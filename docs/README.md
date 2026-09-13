# TasdikiDocs — Documentation

Blockchain-anchored academic certificate verification. Approved institutions
issue certificates that are hashed, pinned to IPFS, and minted on-chain;
anyone can then verify a certificate by QR code or registration number
without contacting the issuing institution.

## Start here

| Document | What it covers |
| --- | --- |
| [architecture.md](architecture.md) | System components, request flows, trust boundaries, key design decisions |
| [data-model.md](data-model.md) | Postgres schema, enums, triggers, RLS policies, migration history |
| [api-reference.md](api-reference.md) | Every REST endpoint: auth, payloads, responses, error codes |
| [mobile-app.md](mobile-app.md) | Expo app structure, routing, auth gating, the API seam |
| [development.md](development.md) | Local setup, environment variables, running, building, troubleshooting |

Root-level [SECURITY.md](../SECURITY.md) maps the project's security
checklist to concrete implementation points.

## System at a glance

```text
┌─────────────────┐
│  Expo / RN app  │  iOS · Android · Web
└────────┬────────┘
         │
         ├──────────────► Supabase Auth + Postgres      (sessions, MFA, profiles,
         │                 (direct, RLS-scoped)          own institution, notifications)
         │
         └──────────────► Express API  /api/v1          (privileged + aggregate logic)
                              │
                              ├──► Supabase (service role, bypasses RLS)
                              ├──► Thirdweb Storage  → IPFS
                              ├──► Polygon Amoy      → CertificateRegistry.sol
                              └──► Gmail SMTP        → password-reset OTP email
```

The app deliberately talks to **two** backends. Supabase handles anything a
user owns and RLS can safely scope (auth, own profile, own notifications).
The Express API owns everything requiring privilege, cross-tenant reads, or
secrets that must never ship in a client bundle (certificate issuance,
on-chain minting, admin analytics, institution approval). See
[architecture.md](architecture.md#why-two-backends) for the reasoning.

## Roles

| Role | How the account is created | Core capability |
| --- | --- | --- |
| **Verifier** | Open self-service signup | Verify certificates by QR scan or search |
| **Institution** | Self-service application → admin approval | Issue and revoke certificates once approved |
| **Admin** | Seeded manually (`server/scripts/seed-admin.js`); no signup path exists | Approve/reject/suspend institutions, global search, analytics, audit log |

## Repository layout

```text
app/          Expo (React Native) + TypeScript client
server/       Node.js / Express API
contracts/    Hardhat + Solidity (CertificateRegistry.sol)
supabase/     SQL migrations, RLS policies, admin seed
docs/         This documentation
SECURITY.md   Security checklist → implementation mapping
```

## Implementation status

Fully wired end to end: Supabase auth (incl. TOTP MFA), institution
application/approval, certificate issuance with real IPFS upload and
on-chain minting, public verification, admin analytics and audit logging,
in-app notifications, institution soft-deactivation, and emailed
password-reset OTPs.

Still mock-backed in the client, with no server counterpart yet — these
render real UI over in-memory data and are documented as gaps rather than
finished features:

- Device sessions (`account/sessions`)
- API keys (`account/api-keys`)
- Institution team/staff management (`(institution)/team`)
- Support tickets (`account/contact-support`)
- Per-institution verification analytics (`(institution)/verification-activity`)

See [mobile-app.md](mobile-app.md#real-vs-mock-backed-features) for the
precise per-function breakdown.

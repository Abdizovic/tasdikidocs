# TasdikiDocs

Blockchain-based academic certificate verification. Institutions issue
tamper-proof digital certificates; anyone (employers or the certificate
holders themselves) can instantly verify authenticity by QR code or search —
without ever contacting the issuing institution directly.

## Roles

- **Institution** — applies, waits for admin approval, then issues/revokes certificates.
- **Verifier** — open self-serve signup; scans or searches to verify a certificate. Covers both "employer checking a candidate" and "student checking their own" — there's no separate student role.
- **Admin** — the single platform account, seeded manually via SQL (`supabase/seed_admin.sql`); no signup path exists for it anywhere in the app.

## Repository layout

```text
app/          Expo (React Native) + TypeScript client — wired to the real backend/Supabase
server/       Node.js/Express backend — real Supabase, on-chain minting, IPFS, email OTP
contracts/    Hardhat + Solidity smart contract project — deployed, called by server/
supabase/     SQL schema, RLS policies, migrations
SECURITY.md   Security checklist → concrete implementation mapping
```

## Current build phase

The app is fully wired end-to-end: real Supabase auth/data (including RLS,
soft-deleted institutions, and MFA), a real Express backend, real on-chain
certificate minting + IPFS storage, and real email delivery for password
reset codes. The smart contract is already deployed — `server/` calls it
directly by address; you don't redeploy or run the contract project to use
the app day to day.

## Documentation

Full documentation lives in [`docs/`](docs/README.md):

| Document | Covers |
| --- | --- |
| [architecture.md](docs/architecture.md) | Components, request flows, trust boundaries, design decisions |
| [data-model.md](docs/data-model.md) | Schema, triggers, RLS policies, migrations |
| [api-reference.md](docs/api-reference.md) | Every REST endpoint and error code |
| [mobile-app.md](docs/mobile-app.md) | App structure, routing, auth gating, the API seam |
| [development.md](docs/development.md) | Setup, env vars, device builds, troubleshooting |

`SECURITY.md` maps the spec's security checklist to implementation points.

## Quick start

Two terminals, every time you develop or test:

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev
```

```bash
# Terminal 2 — app
cd app
npm install
npx expo start -c
```

If you're testing on a physical phone (not a simulator), it must be on the
**same WiFi network** as this machine — the app reaches the backend at this
machine's LAN IP (see `app/.env.local`), not `localhost`.

`contracts/` is only needed if you're changing the Solidity contract itself
(`npx hardhat test` runs its test suite) — it's not part of normal app usage.

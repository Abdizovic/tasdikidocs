# TasdikiDocs Server

Express + TypeScript API. Owns everything requiring privilege, cross-tenant
reads, or secrets that cannot ship in a client bundle: certificate issuance
(IPFS upload + on-chain minting), institution approval, admin analytics and
audit logs, and the password-reset OTP flow.

Full documentation lives in [`../docs/`](../docs/README.md). This file is a
quick reference only, kept short so there is a single source of truth.

## Run it

```bash
npm install
cp .env.example .env     # fill in real values
npm run dev              # tsx watch → http://localhost:4000
curl http://localhost:4000/health
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Watch-mode dev server |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled build |
| `npm test` | Vitest suite |
| `npm run migrate` | Apply `supabase/migrations/*.sql` in order |
| `npm run seed:admin <email> [password]` | Create the platform admin account |

## Layout

```text
src/
├── index.ts            # entry — `import "dotenv/config"` MUST stay the first import
├── app.ts              # Express app: helmet, CORS, JSON, logging, /api/v1, error handlers
├── routes/             # HTTP layer: Zod validation + auth guards only
├── services/           # business logic; all Supabase access lives here
├── middleware/         # auth, validate, rateLimiter, errorHandler
├── lib/                # supabase, contract (ethers + IPFS), mailer, logger
└── types/domain.ts     # shared domain types
```

## Read more

- Endpoint reference → [docs/api-reference.md](../docs/api-reference.md)
- Auth model, issuance pipeline, on-chain design → [docs/architecture.md](../docs/architecture.md)
- Environment variables and troubleshooting → [docs/development.md](../docs/development.md)

## Security invariant

A client can never set its own `role`, nor an institution's `status`.
Enforced independently at the route layer (`requireRole`), the service layer
(neither field is ever read from a request body), and the database
(`prevent_protected_field_change` trigger). See
[docs/architecture.md](../docs/architecture.md#trust-boundary).

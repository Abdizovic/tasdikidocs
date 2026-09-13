# TasdikiDocs Smart Contracts

Hardhat + Solidity project for **TasdikiDocs**, a blockchain academic-certificate
verification system. This folder is a standalone, self-contained smart
contract project — nothing in `app/`, `server/`, or `supabase/` calls it yet.
That wiring happens in a later phase via the Thirdweb SDK (see
[What the Thirdweb integration phase will need](#what-the-thirdweb-integration-phase-will-need)
below).

## What the contract does

`contracts/CertificateRegistry.sol` is an on-chain registry of academic
certificates issued by approved institutions:

- Only a **hash** of the certificate's canonical data and an **IPFS URI**
  pointing at the full document/metadata are stored on-chain. This keeps gas
  costs low while still letting anyone publicly verify a certificate's
  validity (active vs. revoked) from its on-chain record.
- Institutions must be approved by the platform admin (the contract deployer)
  before they can issue certificates. Approval/suspension is managed with
  OpenZeppelin `AccessControl`:
  - `DEFAULT_ADMIN_ROLE` — the platform owner. Can approve/suspend
    institutions and revoke any certificate.
  - `ISSUER_ROLE` — granted per approved institution wallet. Required to
    issue certificates.
- Certificates cannot be issued twice with the same `certificateHash`
  (duplicate protection), and can be revoked either by the institution that
  originally issued them or by an admin (e.g. in cases of fraud).
- All state-changing errors use Solidity **custom errors** instead of
  `require` strings, for cheaper gas and clearer failure reasons.

### Contract surface

| Function | Access | Purpose |
| --- | --- | --- |
| `issueCertificate(bytes32 certificateHash, string metadataURI)` | `ISSUER_ROLE` | Issues a new certificate, returns its auto-incrementing `certificateId`. |
| `revokeCertificate(uint256 certificateId, string reason)` | original issuer or `DEFAULT_ADMIN_ROLE` | Marks a certificate as revoked. |
| `verifyCertificate(uint256 certificateId)` | public | Returns the full `Certificate` record, reverts with `CertificateNotFound` if it doesn't exist. |
| `verifyByHash(bytes32 certificateHash)` | public | Same as above, looked up by hash instead of id. |
| `approveInstitution(address wallet)` | `DEFAULT_ADMIN_ROLE` | Grants `ISSUER_ROLE` to an institution wallet. |
| `suspendInstitution(address wallet)` | `DEFAULT_ADMIN_ROLE` | Revokes `ISSUER_ROLE` from an institution wallet. |

Events: `CertificateIssued`, `CertificateRevoked`, `InstitutionApproved`,
`InstitutionSuspended`.

Custom errors: `CertificateNotFound(uint256 id)`,
`CertificateAlreadyRevoked(uint256 id)`,
`DuplicateCertificateHash(bytes32 hash)`, `InvalidCertificateHash()`,
`NotAuthorizedForCertificate(uint256 id, address caller)`.

## Mapping to the off-chain Supabase `certificates` table

This contract is the on-chain source of truth for certificate validity; the
Supabase `certificates` table is the off-chain source of truth for
human-readable metadata (student name, course, institution profile, etc).
The two are linked as follows:

| On-chain (`CertificateRegistry`) | Off-chain (Supabase `certificates` table) | Notes |
| --- | --- | --- |
| `certificateHash` (bytes32) | `certificate_hash` | The Supabase row's canonical data (student, course, date, institution, etc.) is hashed the same way off-chain and on-chain so the two can be cross-checked. |
| `metadataURI` (string, `ipfs://...`) | `ipfs_uri` | Points at the full certificate document/metadata pinned to IPFS. |
| `certificateId` (uint256, returned by `issueCertificate`) | new `onchain_certificate_id` (or similar) column, written back after mint | Lets the backend look up the on-chain record directly via `verifyCertificate` instead of only by hash. |
| mint transaction hash | `tx_hash` | Written back to the Supabase row once `issueCertificate` is mined, so the app can link to a block explorer. |
| `issuer` (address) | institution's registered wallet address on its Supabase profile | Used to confirm the certificate was issued by the institution it claims to be from. |
| `revoked` / `revokedAt` | `status` (`active` / `revoked`) / `revoked_at` | The backend should treat the on-chain values as authoritative and sync them into Supabase whenever a revocation happens (or periodically re-sync on read). |

In short: Supabase stores the rich, queryable off-chain metadata; the
blockchain stores just enough (`certificateHash` + `metadataURI`) to prove a
certificate hasn't been forged or tampered with, and whether it's still
active.

## What the Thirdweb integration phase will need

This project does not import or configure Thirdweb — that happens in a later
phase in `app/`/`server/`. When that phase begins, it will need the ABI
(generated at `contracts/artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json`
after running `npm run compile`) and the deployed contract address, then call:

- **`issueCertificate(certificateHash, metadataURI)`** — called by the
  backend on behalf of an approved institution wallet (or directly from the
  institution's connected wallet via Thirdweb) when a new certificate is
  minted. The returned `certificateId` (and the mint tx hash) should be
  written back onto the corresponding Supabase `certificates` row.
- **`revokeCertificate(certificateId, reason)`** — called when an institution
  or admin revokes a certificate from the app's dashboard.
- **`verifyCertificate(certificateId)`** / **`verifyByHash(certificateHash)`**
  — called from the public verification page so anyone can check a
  certificate's on-chain status without needing a wallet or gas.
- **`approveInstitution(wallet)`** / **`suspendInstitution(wallet)`** —
  called by the platform admin dashboard when approving or suspending an
  institution's application.

## Project layout

```
contracts/
  contracts/
    CertificateRegistry.sol
  scripts/
    deploy.ts
  test/
    CertificateRegistry.ts
  hardhat.config.ts
  package.json
  tsconfig.json
  .env.example
  .gitignore
```

## Setup

```bash
cd contracts
npm install
```

## Running tests

Tests run entirely on Hardhat's built-in local network and require no `.env`
file at all:

```bash
npm test
```

## Compiling

```bash
npm run compile
```

## Deploying to Polygon Amoy testnet

1. Copy `.env.example` to `.env` and fill in your own values:

   ```
   POLYGON_AMOY_RPC_URL=your-alchemy-or-infura-amoy-rpc-url
   PRIVATE_KEY=your-wallet-private-key
   POLYGONSCAN_API_KEY=your-polygonscan-api-key
   ```

   Never commit `.env` — it's already listed in `.gitignore`. Use a deployer
   wallet funded with test MATIC from the
   [Polygon Amoy faucet](https://faucet.polygon.technology/), not a wallet
   holding real funds.

2. Deploy:

   ```bash
   npm run deploy:amoy
   ```

   This runs `scripts/deploy.ts`, which deploys `CertificateRegistry` and logs
   its address. If `POLYGONSCAN_API_KEY` is set, it also prints the exact
   `hardhat verify` command to run next.

3. (Optional) Verify the contract source on Polygonscan:

   ```bash
   npx hardhat verify --network polygonAmoy <deployed-address>
   ```

## Local deployment

To deploy to a local Hardhat network for manual testing:

```bash
npm run deploy:local
```

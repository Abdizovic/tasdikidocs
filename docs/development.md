# Development Guide

## Prerequisites

- Node.js 20+
- A Supabase project
- A Thirdweb account (secret key — covers IPFS; no separate Pinata account needed)
- A funded Polygon Amoy testnet wallet
- A Gmail account with an App Password (for OTP email)
- For device builds: an [Expo](https://expo.dev) account and `eas-cli`

## First-time setup

```bash
# 1. Backend
cd server
npm install
cp .env.example .env          # then fill in real values (see below)
npm run migrate               # applies supabase/migrations/*.sql in order
npm run seed:admin admin@example.com   # prints a generated password if omitted

# 2. Smart contract (only if not already deployed)
cd ../contracts
npm install
npm run deploy:amoy           # copy the printed address into server/.env

# 3. App
cd ../app
npm install
# create .env.local (see below)
```

## Running day to day

Two terminals:

```bash
# Terminal 1 — API
cd server && npm run dev      # tsx watch, http://localhost:4000

# Terminal 2 — app
cd app && npx expo start -c   # Metro bundler on :8081
```

`contracts/` is **not** part of the normal run loop. The contract is already
deployed and the server calls it by address; you only touch that project when
changing the Solidity itself.

Sanity check the API before debugging the app:

```bash
curl http://localhost:4000/health
# {"status":"ok","uptime":...,"timestamp":"..."}
```

## Environment variables

### `server/.env`

| Variable | Purpose |
| --- | --- |
| `PORT` | Default `4000` |
| `NODE_ENV` | `development` / `production`. Also gates the `x-mock-user-id` test shim |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Bypasses RLS — server only, never in the client |
| `SUPABASE_ANON_KEY` | Public key |
| `DATABASE_POOL_URL` | PgBouncer pooler (port 6543). Used only by `npm run migrate` |
| `SMTP_GMAIL_USER` / `SMTP_GMAIL_APP_PASSWORD` | OTP email delivery. Must be a Google **App Password**, not the account password |
| `THIRDWEB_SECRET_KEY` | **Secret.** IPFS uploads |
| `PLATFORM_WALLET_PRIVATE_KEY` | **Secret.** The single signer that mints all certificates |
| `POLYGON_AMOY_RPC_URL` | Default `https://rpc-amoy.polygon.technology` |
| `POLYGON_AMOY_CHAIN_ID` | `80002` |
| `CERTIFICATE_REGISTRY_ADDRESS` | Deployed contract address |
| `CORS_ORIGIN` | Comma-separated allowlist; permissive in development |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Global limiter, defaults 15 min / 100 |

`server/src/index.ts` must keep `import "dotenv/config";` as its **first**
import. `tsx` transpiles to CommonJS and hoists all `import` statements above
interspersed code, so the older `import dotenv …; dotenv.config();` pattern
ran *after* modules that read `process.env` at import time, and the server
crashed on startup.

### `app/.env.local`

Only `EXPO_PUBLIC_`-prefixed variables reach the client — and they are
**inlined into the JS bundle**, so never put a secret here. The anon key is
designed for this; the service role key must never appear.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | RLS-scoped public key |
| `EXPO_PUBLIC_API_URL` | Express base URL, e.g. `http://192.168.1.50:4000/api/v1` |

**`EXPO_PUBLIC_API_URL` must be your machine's LAN IP, not `localhost`** — on
a phone, `localhost` means the phone. Find it with `ipconfig` (Windows) or
`ifconfig`/`ip addr` (macOS/Linux) and update this whenever your IP changes.

Env changes are read at Metro startup only. Restart `npx expo start -c` after
editing; hot reload will not pick them up.

## Testing on a physical device

Requirements, all three:

1. Phone and computer on the **same WiFi network**
2. `npm run dev` running in `server/`
3. `EXPO_PUBLIC_API_URL` set to the computer's current LAN IP

### Use the custom dev client, not Expo Go

This project depends on native modules (camera, secure store, image picker),
so it needs a custom development client:

```bash
cd app
eas build --profile development --platform android
```

Install the resulting APK, then open the **TasdikiDocs** app (not Expo Go) and
it connects to Metro automatically. If scanning a QR code, use the phone's
**camera app** — scanning from inside Expo Go forces it to open there.

### Build profiles (`eas.json`)

| Profile | Output | Needs Metro running? |
| --- | --- | --- |
| `development` | Dev-client APK — native shell only, loads JS from Metro | **Yes** |
| `preview` | Standalone APK with JS bundled in | No |
| `production` | Store build, auto-incrementing version | No |

Day-to-day work uses `development` (instant hot reload; rebuild only when
native config changes). Build `preview` occasionally to share a snapshot —
it freezes the JS at build time, so code changes need another build.

Note that a `preview` build still points at whatever `EXPO_PUBLIC_API_URL`
was set at build time, so it remains dependent on your local server and WiFi.

### Android cleartext HTTP

Android blocks plain-HTTP traffic from apps by default. Because the dev
backend is served over `http://<LAN-IP>:4000`, the app needs:

```json
["expo-build-properties", { "android": { "usesCleartextTraffic": true } }]
```

in `app.json`'s `plugins`. This must go through the
`expo-build-properties` plugin — setting `usesCleartextTraffic` directly
under `android` in `app.json` is **not** part of Expo's config schema and is
silently ignored at build time.

It is also a **native** setting: changing it requires a rebuild, not a
reload. Verify it landed with:

```bash
aapt2 dump xmltree app.apk --file AndroidManifest.xml | grep -i cleartext
# android:usesCleartextTraffic(0x010104ec)=true
```

For production this should be removed and the API served over HTTPS.

## Verification commands

Run before considering any change done:

```bash
cd app    && npx tsc --noEmit && npx expo lint
cd server && npx tsc --noEmit && npm test
```

`npx expo export -p web` in `app/` is a useful extra check — it catches
route-resolution and SSR-prerender problems that `tsc` cannot.

## Troubleshooting

### Every backend-driven screen spins forever

Almost always the API is unreachable, not an app bug. Work through:

1. `curl http://localhost:4000/health` — is the server even running?
2. Open `http://<LAN-IP>:4000/health` **in the phone's browser**. This cleanly separates network problems from app problems: if the browser works but the app does not, suspect cleartext HTTP (above) or a missing `.catch()` masking a real error.
3. Confirm `EXPO_PUBLIC_API_URL` matches your current LAN IP — Windows silently reconnects to known WiFi networks and changes it.
4. Some routers isolate clients from each other ("AP isolation"), blocking phone→PC traffic entirely. A phone hotspot with the laptop joined to it is a quick workaround.

### `EADDRINUSE :::4000`

An earlier server is still running. On Windows, killing the terminal does not
always kill the `node.exe`:

```powershell
Get-NetTCPConnection -LocalPort 4000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### `TurboModuleRegistry.getEnforcing('PlatformConstants')`

`react` / `react-dom` / `react-native` do not match the installed Expo SDK, or
the installed native binary predates a native-config change. Check
`node_modules/expo/bundledNativeModules.json` for the required versions, fix
with `npx expo install react react-dom react-native`, and rebuild the dev
client.

### `Cannot convert a Symbol value to a string`

A React Fragment was passed as a direct child of `<Stack>`. See
[mobile-app.md](mobile-app.md#routing-and-auth-gating).

### Sign-in succeeds but the screen never changes

Route gating is not using `Stack.Protected`. Confirm with DevTools' Network
tab that `/auth/v1/token` returned 200 — if it did, the bug is navigation,
not auth.

### `Error: Slow 4G` / everything is inexplicably slow on web

Check the throttling dropdown in Chrome DevTools' Network tab.

### Play Protect blocks the APK

Expected for sideloaded builds. Tap **More details → Install anyway**, or
temporarily disable Play Protect scanning in the Play Store app.

### Supabase or Postgres calls intermittently time out

`ETIMEDOUT` / `AuthRetryableFetchError: fetch failed` on some networks is
usually transient — retry before investigating. `migrate.js` already forces
IPv4 DNS resolution and retries for this reason.

### `user_already_exists` (422) on signup

The email already has an account. Sign in instead — the signup screen
correctly refuses to create a duplicate.

## Adding features

- **New API endpoint:** add a Zod schema and route in `server/src/routes/`, business logic in `server/src/services/`, then expose it through `app/src/lib/mockApi.ts`. Guard with `requireAuth` + `requireRole`, and never accept an owner id from the request body — derive it from `req.user`.
- **New notification type:** call `notificationService.create()` from the relevant service. No schema change needed.
- **New table:** add a numbered migration in `supabase/migrations/`, enable RLS, and write policies. RLS-enabled with no policies means "service role only", which is a valid and often correct choice.
- **New native dependency:** install with `npx expo install`, then rebuild the dev client — JS reload is not enough.

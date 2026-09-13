# TasdikiDocs — Mobile App

Expo (React Native) + TypeScript client covering all three roles — verifier,
institution, and admin — on Android, iOS, and web.

Full documentation lives in [`../docs/`](../docs/README.md). This file is a
quick reference only, kept short so there is a single source of truth.

## Run it

```bash
npm install
npx expo start -c
```

Press `w` for web. For a physical device, open the **TasdikiDocs** dev-client
app (not Expo Go — this project uses native modules Expo Go doesn't include).

Requires all three:

1. `npm run dev` running in `../server`
2. Phone on the **same WiFi** as this machine
3. `EXPO_PUBLIC_API_URL` in `.env.local` set to this machine's **LAN IP**, not `localhost`

## `.env.local`

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:4000/api/v1
```

`EXPO_PUBLIC_` values are inlined into the JS bundle — never put a secret
here. Metro reads them at startup only; restart with `-c` after editing.

## Verify a change

```bash
npx tsc --noEmit
npx expo lint
npx expo export -p web    # catches routing/SSR problems tsc can't
```

## Version pinning

`react`, `react-dom`, and `react-native` must match what the installed Expo
SDK declares in `node_modules/expo/bundledNativeModules.json`. A mismatch
causes a native startup crash no cache clear will fix. Change them only via
`npx expo install`.

## Read more

- Structure, routing, auth gating, the API seam → [docs/mobile-app.md](../docs/mobile-app.md)
- Device builds, EAS profiles, troubleshooting → [docs/development.md](../docs/development.md)
- Endpoint reference → [docs/api-reference.md](../docs/api-reference.md)

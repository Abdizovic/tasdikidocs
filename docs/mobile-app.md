# Mobile App

Expo SDK 57 · React Native 0.86.2 · React 19.2.3 · expo-router · TypeScript.
Targets Android, iOS, and web from one codebase.

> Version pinning is not cosmetic. `react`, `react-dom`, and `react-native`
> must match exactly what the installed Expo SDK declares in
> `node_modules/expo/bundledNativeModules.json`. A mismatch produces a native
> crash at startup (`TurboModuleRegistry.getEnforcing('PlatformConstants')`)
> that no cache clear will fix. Change these only via `npx expo install`.

## Directory layout

```text
app/src/
├── app/                    # expo-router file-based routes
│   ├── _layout.tsx         # root: providers + role gating
│   ├── (auth)/             # signed-out screens
│   ├── (institution)/      # institution tabs
│   ├── (verifier)/         # verifier tabs
│   ├── (admin)/            # admin tabs
│   ├── account/            # shared settings, all roles
│   ├── notifications.tsx
│   └── verify/[certId].tsx # public deep-link target for QR codes
├── components/
│   ├── ui/                 # design-system primitives
│   ├── account/            # settings-row building blocks
│   ├── certificates/       # CertificateCard
│   └── institution/
├── context/                # AuthContext, PreferencesContext
├── lib/                    # API seam, Supabase client, helpers
├── theme/                  # palette + useAppTheme
└── types/                  # shared domain types
```

## Routing and auth gating

`src/app/_layout.tsx` composes the providers and decides which route group
the user may enter:

```text
GestureHandlerRootView
└── SafeAreaProvider
    └── PreferencesProvider        (theme / language preferences)
        └── AuthProvider           (session, sign-in/up, MFA)
            └── RootNavigator      (Stack + Stack.Protected guards)
```

Gating uses expo-router's **`Stack.Protected`**:

```tsx
<Stack.Protected guard={!session}>
  <Stack.Screen name="(auth)" />
</Stack.Protected>
<Stack.Protected guard={!!session}>
  <Stack.Protected guard={role === 'institution'}><Stack.Screen name="(institution)" /></Stack.Protected>
  <Stack.Protected guard={role === 'verifier'}>   <Stack.Screen name="(verifier)" /></Stack.Protected>
  <Stack.Protected guard={role === 'admin'}>      <Stack.Screen name="(admin)" /></Stack.Protected>
  <Stack.Screen name="account" />
  <Stack.Screen name="notifications" />
</Stack.Protected>
<Stack.Screen name="verify/[certId]" />   {/* public, outside every guard */}
```

Two constraints here are easy to violate and expensive to debug:

1. **Use `Stack.Protected`, not a plain conditional.** An earlier version used `{!session && <Stack.Screen … />}`. Screens appeared and disappeared correctly, but the router had no signal to *redirect away* from a screen that just became invalid — so a successful sign-in updated state while the UI sat on the login screen forever (and on Android, crashed the native navigator). `guard` is what drives the redirect.
2. **Never wrap `Stack` children in a Fragment.** `expo-router` inspects each child's `type` when resolving screens; a Fragment's type is a `Symbol`, which throws `Cannot convert a Symbol value to a string`. Each child must be a `Stack.Screen`, a `Stack.Protected`, or `false`.

`verify/[certId]` sits outside all guards deliberately — a QR-code deep link
must resolve for someone who is not signed in.

## Screens by role

### `(auth)` — signed out

`index` (landing) · `login` · `signup` (verifier) · `institution-apply` ·
`forgot-password` · `verify-otp` · `reset-password`

### `(verifier)`

Tabs: `home` · `history` · `profile`.
Hidden routes: `scan` (camera QR) · `search` · `result`.

### `(institution)`

Tabs: `dashboard` · `certificates` · `team` · `profile`.
Hidden routes: `issue-certificate` · `bulk-issue` (CSV) ·
`certificate/[id]` · `verification-activity`.

Institutions that are pending, rejected, or suspended see
`InstitutionStatusScreen` instead of the issuing UI.

### `(admin)`

Tabs: `dashboard` (analytics + audit trail) · `applications` ·
`institutions` · `certificates` (global search) · `profile`.
Hidden routes: `application/[id]` · `certificate/[id]`.

### `account/` — shared

`edit-profile` · `change-password` · `two-factor` · `sessions` ·
`api-keys` · `appearance` · `language-region` · `notifications` ·
`audit-log` · `linked-accounts` · `help` · `faq` · `documentation` ·
`contact-support` · `delete-account`.

## The API seam

All data access goes through **`src/lib/mockApi.ts`**.

> **Naming wart:** this file is no longer mock. It dates from the
> mock-data phase and kept its name through the real-backend migration to
> avoid a large mechanical rename across every screen. It is the real API
> layer. A rename to `api.ts` is worthwhile cleanup.

It dispatches to one of two backends:

| Module | Used for |
| --- | --- |
| `lib/supabase.ts` | Auth, MFA, own profile, own institution, own notifications — anything RLS can scope |
| `lib/apiClient.ts` | Everything privileged or cross-tenant, via Express |

`apiClient.ts` is a thin `fetch` wrapper that attaches the current Supabase
access token as a bearer header, unwraps `{ error: { message, code } }` into
an `ApiError`, and converts network failures into
`ApiError('Could not reach the server…', 'network_error')`.

### Session storage

`lib/supabase.ts` supplies a storage adapter because Supabase's default
assumes `localStorage`:

- **Native:** `expo-secure-store` (encrypted; 2048-byte value limit, fine for a JWT).
- **Web:** `window.localStorage`.
- **SSR/static export:** `typeof window === 'undefined'` short-circuits to no-ops so `expo export` prerendering doesn't crash.

An `AppState` listener starts/stops Supabase's auto token refresh with
foreground/background, so a session cannot silently expire while backgrounded.

### Error handling convention

Every screen that loads data must attach a `.catch()` and render the message.
A missing `.catch()` leaves the spinner running forever with no signal to
either the user or the developer — which is exactly how a whole class of
"stuck loading" bugs hid a simple connectivity failure for hours:

```tsx
useFocusEffect(
  useCallback(() => {
    setError(null);
    listInstitutions()
      .then(setInstitutions)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load institutions.'));
  }, []),
);
```

Render order should be `error → loading → empty → data`.

## Real vs mock-backed features

| Area | Backing |
| --- | --- |
| Sign in / up / out, session restore | Supabase Auth |
| TOTP MFA (enroll, challenge, unenroll) | Supabase Auth MFA |
| Password reset (OTP by email) | Express → `authService` → Gmail SMTP |
| Own profile read/update, password change | Supabase (RLS) |
| Institution apply / own institution | Express + Supabase |
| Issue, bulk-issue, revoke, list certificates | Express (real IPFS + on-chain mint) |
| Public verification | Express (public endpoint) |
| Admin: applications, institutions, global search, analytics, audit logs | Express (admin-only) |
| Notifications (list, mark read) | Supabase `notifications` (RLS) |
| Account deactivation (institution) | Express soft delete |
| **Device sessions** | ⚠️ In-memory mock |
| **API keys** | ⚠️ In-memory mock |
| **Institution team / staff invites** | ⚠️ In-memory mock — no `institution_members` table exists |
| **Support tickets** | ⚠️ In-memory mock — no table, submitting only returns a fake ticket id |
| **Institution verification activity** | ⚠️ Seeded mock — no institution-scoped events endpoint exists |

Mock state lives in `lib/mockDb.ts` and does not survive a reload.

Also stale: the JSDoc above `issueCertificate` in `mockApi.ts` claims IPFS
upload is "the next phase" and that `ipfs_uri` comes back null. That is no
longer true — the server performs the upload and mint, and both `ipfs_uri`
and `tx_hash` are populated.

## Notable implementation details

**Public web verification.** `verify/[certId].tsx` is reachable with no
login and sets per-certificate SEO tags via `expo-router/head`. A
certificate's QR code encodes a link to this page rather than an app-only
deep link, so scanning works even without the app installed once the web
build (`app.json` → `web.output: "static"`) is deployed.

**Visual certificates.** `components/certificates/CertificateCard.tsx`
renders a diploma-styled card wherever a certificate appears — verifier
result, public verify page, and institution/admin detail screens.

**Bulk issuance.** `(institution)/bulk-issue.tsx` downloads a CSV template,
accepts a completed one, and issues rows in a single pass via
`lib/csv.ts` + `bulkIssueCertificates`. Each row is a separate API call, so
partial success is normal — the result screen reports issued vs. failed with
a per-row reason.

**Validation.** `lib/validation.ts` centralizes email format checking and
the 5-rule password policy (8+ characters, upper, lower, number, special),
surfaced live by `PasswordStrengthChecklist` everywhere a password is set.

**Internationalization of inputs.** `data/countries.ts` (~60 countries)
backs both the institution country picker and every phone field's dial-code
chip, via `CountryField` / `PhoneField` / `CountryPickerModal`.

**Client-side login lockout.** Five wrong password attempts lock that email
for 60 seconds with a live countdown. Supabase exposes no client-visible
lockout, so this counter in `mockApi.ts` is what drives the UX;
`ApiError.retryAfterSeconds` carries the remaining time to the screen. Being
client-side, it is a usability guard rather than a security control — the
server-side `otpLimiter` and Supabase's own protections are the real
defense.

## Theming

`useAppTheme()` returns colors, spacing, radii, and typography derived from
`theme/palette.ts` and the user's appearance preference from
`PreferencesContext`. Components must not hardcode colors — every UI
primitive in `components/ui/` reads from the theme so light/dark both work.

## Verification history

`lib/verificationHistory.ts` keeps the verifier's recent lookups on-device.
This is local convenience state, not a server-side record; the authoritative
audit trail is the `verification_events` table, which is admin-only.

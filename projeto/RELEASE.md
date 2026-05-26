# Release Runbook — App Store + Google Play

Step-by-step guide to build and submit PsiquèIA to both stores. Run from
`projeto/`. Everything below assumes a clean working tree.

## 0. One-time setup (do once per environment)

### 0.1 Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 0.2 Wire the project to EAS

```bash
eas init --id-only          # writes the real projectId into app.json
eas project:link            # confirms the link
```

> The `extra.eas.projectId` placeholder (`00000000-…`) MUST be replaced
> before the first build. `eas init --id-only` does it for you and
> updates the file in place — commit that change.

### 0.3 Provide store credentials

#### Apple

Choose ONE of:

1. **Interactive (recommended for dev machines)** — `eas build --platform ios`
   will prompt you for the Apple ID and create / fetch certs on demand.
2. **App Store Connect API key (recommended for CI)** — create one at
   App Store Connect → Users and Access → Keys, download the `.p8`,
   then store it as an EAS secret:

   ```bash
   eas secret:create --scope project --name APPLE_APP_SPECIFIC_PASSWORD --value '<password>'
   eas credentials   # menu-driven; upload the .p8 once
   ```

Fill the env vars consumed by `eas.json` submit profile:

```bash
eas secret:create --scope project --name APPLE_ID         --value 'you@example.com'
eas secret:create --scope project --name ASC_APP_ID       --value '1234567890'
eas secret:create --scope project --name APPLE_TEAM_ID    --value 'ABCDE12345'
```

`ASC_APP_ID` is the numeric ID Apple assigns once the app skeleton exists
in App Store Connect — create the app there first (see §1).

#### Google Play

1. Create a service account in Google Cloud Console, grant it the
   "Service Account User" role.
2. In Google Play Console → Setup → API access → link that service
   account, give it the "Release manager" role.
3. Download the JSON key as `playstore-service-account.json` and place
   it at `projeto/playstore-service-account.json`. It is in `.gitignore`
   and `.easignore` — DO NOT commit it.

### 0.4 Runtime secrets (env vars)

EAS Build needs `EXPO_PUBLIC_*` to be present at bundle time. Set them
as EAS secrets so they're injected during the cloud build:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL      --value 'https://<project>.supabase.co'
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value '<anon-key>'
# add any other EXPO_PUBLIC_* the app reads from process.env
```

Server-side secrets (Stripe, Resend, OpenAI/OnSpace, service-role, etc.)
go in Supabase Edge Function settings — not in the mobile bundle.

## 1. Create the app skeleton in both stores

This must be done in the web consoles, ONCE per app.

### App Store Connect

1. Sign in to https://appstoreconnect.apple.com → My Apps → **+** →
   "New App".
2. Platform: iOS. Bundle ID: `com.psiqueia.app`. SKU: `psiqueia-ios`.
3. After save: copy the App ID (numeric) → that's `ASC_APP_ID`.
4. Fill the metadata: name, subtitle, category, support URL, marketing
   URL, privacy policy URL (use the one in `POLITICA_DE_PRIVACIDADE.md`
   published somewhere reachable), age rating, copyright.
5. Fill the privacy nutrition label (data collected: account, health,
   diagnostics — see `docs/guias/GUIA_APPLE_CONNECT.md` for the exact
   answers we plan to give).
6. Add the App Tracking Transparency declaration if applicable
   (currently we do not use IDFA so leave it off).

### Google Play Console

1. Sign in to https://play.google.com/console → **Create app**.
2. Name: PsiquèIA. Default language: pt-BR. App type: App. Free.
3. Declare it as a Health & Fitness app, fill the data safety form
   (see `docs/guias/CHECKLIST_PRE_LANCAMENTO.md`).
4. Confirm policies and target age (13+).
5. Set up the internal testing track first — that's where the first
   build lands.

## 2. Pre-flight checklist

Run from `projeto/`:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
```

All four must be green. CI enforces this on `main`.

Bump versions for THIS release:

- `app.json` → `expo.version` (semver, what users see)
- `app.json` → `expo.ios.buildNumber` (CFBundleVersion — monotonic)
- `app.json` → `expo.android.versionCode` (monotonic int)

> `eas.json` has `autoIncrement: true` for the production profile, so
> `buildNumber` and `versionCode` will be bumped automatically by EAS
> when you build. Editing them manually is only needed for non-EAS
> builds.

Sanity-check the bundle identifiers match what was registered in the
stores (`com.psiqueia.app` in both).

## 3. Build production binaries

```bash
# iOS (.ipa)
eas build --platform ios --profile production

# Android (.aab)
eas build --platform android --profile production

# Both at once
eas build --platform all --profile production
```

EAS prints a URL while it runs; both binaries land in your EAS
dashboard at https://expo.dev/accounts/<owner>/projects/psiqueia/builds.

Cold builds take ~15–25 min. Hermes + ProGuard are enabled for
Android (see `eas.json`).

## 4. Submit

### 4.1 Apple (TestFlight first, then App Store)

```bash
# Uploads the latest production iOS build to App Store Connect.
# It lands in the "Builds" tab; TestFlight processing takes 10–30 min.
eas submit --platform ios --profile production
```

After Apple finishes processing:

1. App Store Connect → TestFlight → add the build to a test group.
2. Smoke-test on real device(s).
3. Once happy → App Store → version → select the build → submit for
   review.

### 4.2 Google Play (internal track first)

```bash
# Uploads the latest production Android build as a DRAFT to the
# internal track (configured in eas.json submit profile).
eas submit --platform android --profile production
```

After Google finishes processing:

1. Play Console → Internal testing → Releases → review and confirm.
2. Add testers, install, smoke-test.
3. Promote: Internal → Closed → Open → Production, one track at a time.

## 5. OTA updates (after the first store release)

For JS/asset-only changes that don't need a new binary:

```bash
eas update --branch production --message "patch: <short note>"
```

`app.json` has `runtimeVersion.policy: "appVersion"` — updates apply
only to clients running the same `expo.version`. Bump the version
field whenever you change native code.

## 6. Rollback

- iOS: in App Store Connect, take the release down or expedite a new
  build via the same `eas submit` flow with a fixed binary.
- Android: in Play Console, halt the rollout on the track. To revert,
  release the previous AAB with a higher version code, or use
  Play Console's "Use this release" on an older one.
- OTA: `eas update --branch production --message "rollback"` and
  publish the prior commit's JS bundle.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `eas build` fails with "projectId not found" | Placeholder in `app.json` | Run `eas init --id-only`, commit the change |
| iOS build fails on credentials | Apple Developer team not selected | `eas credentials` → choose team |
| Android submit rejects with "InvalidPackageName" | Mismatched package | Ensure `android.package` in `app.json` matches the Play Console listing exactly |
| App Store rejects for missing privacy label | Nutrition label not filled | Fill it in App Store Connect under App Privacy |
| Crash at startup, no logs | Missing `EXPO_PUBLIC_SUPABASE_URL` | `lib/supabase.ts` throws when those env vars are missing; verify they're set as EAS secrets |
| Stripe webhook stops firing post-release | Edge Function env var rotated | Re-deploy the function and update STRIPE_WEBHOOK_SECRET in Supabase |

## 8. Building from GitHub Actions (optional)

`.github/workflows/eas-build.yml` exposes a manual-dispatch workflow
that runs the same lint/typecheck/test gate as CI, then calls
`eas build` (and optionally `eas submit`) from a clean Ubuntu runner.
It never runs on push — only when you trigger it from the Actions tab.

Required repository secrets (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|---|---|
| `EXPO_TOKEN` | EAS API token (`eas login` → `eas whoami --json` or [generate one](https://expo.dev/accounts/settings/access-tokens)) |
| `EXPO_PUBLIC_SUPABASE_URL` | Mirrors the EAS secret of the same name; lets `eas build` surface missing-config errors before the cloud build starts |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same as above |
| `APPLE_ID` | Only used when submitting to App Store |
| `ASC_APP_ID` | Only used when submitting to App Store |
| `APPLE_TEAM_ID` | Only used when submitting to App Store |

Trigger flow:

1. Actions tab → **EAS Build & Submit** → Run workflow.
2. Pick the profile (development / preview / production), the platform,
   and whether to submit.
3. Watch the run; the EAS build URL appears in the `eas build` step's
   logs. Build artifacts live in your EAS dashboard, not in GitHub.

The Android submit JSON service-account file still has to be uploaded
to EAS via `eas credentials` — it cannot be a GitHub secret because
EAS reads it from disk at submit time.

## 9. Useful local commands

```bash
pnpm start                       # Expo Dev Client
eas build:list                   # see recent builds
eas build:view <id>              # detailed status + logs
eas channel:view production      # what OTA bundle is live
eas update:list --branch production
```

## 10. References

- App Store Connect docs: https://developer.apple.com/help/app-store-connect/
- Google Play Console: https://support.google.com/googleplay/android-developer
- EAS Build / Submit: https://docs.expo.dev/eas/
- In-repo guides:
  - `docs/guias/GUIA_APPLE_CONNECT.md`
  - `docs/guias/CHECKLIST_PRE_LANCAMENTO.md`
  - `docs/guias/GUIA_FINAL_LANCAMENTO.md`
  - `docs/guias/CONFIGURACAO_OAUTH.md`
  - `docs/guias/JUSTIFICATIVA_ACTIVITY_RECOGNITION.md`

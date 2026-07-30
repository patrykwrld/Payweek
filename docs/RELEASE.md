# Payweek — release runbook

Everything needed to get a signed AAB into Play Console closed testing.

> **Build environment note.** The AAB has not been built in CI for this repo:
> the development container's network policy blocks `dl.google.com`, which is
> where both the Android Gradle Plugin and the Android SDK are served from, so
> Gradle cannot resolve the toolchain there. Run the commands below on a
> machine with the Android SDK (Android Studio, or `sdkmanager`). The signing
> configuration in `android/app/build.gradle` is wired and ready; the
> `keytool` invocation in step 1 has been verified.

## 0. Prerequisites

- JDK 21 (`java -version`)
- Android SDK with platform + build-tools matching `android/variables.gradle`
- `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) exported
- Node 22, `npm ci` run at the repo root

## 1. Create the upload key (once, ever)

```sh
keytool -genkeypair -v \
  -keystore android/payweek-upload.jks \
  -alias payweek-upload \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Payweek, O=Payweek, C=GB"
```

Then create `android/keystore.properties` from the example:

```properties
storeFile=payweek-upload.jks
storePassword=<the store password you just set>
keyAlias=payweek-upload
keyPassword=<the key password you just set>
```

**Back up the `.jks` and both passwords somewhere you will still have in five
years.** Losing the upload key means you cannot ship updates to the listing.
Both the keystore and `keystore.properties` are gitignored — keep it that way.
CI can instead supply `PAYWEEK_KEYSTORE_FILE`, `PAYWEEK_KEYSTORE_PASSWORD`,
`PAYWEEK_KEY_ALIAS` and `PAYWEEK_KEY_PASSWORD` as secrets.

Enrol in **Play App Signing** when you first upload (Play Console offers it).
Google then holds the app signing key and your `.jks` is only the *upload* key,
which can be reset by support if lost.

## 2. Build the release bundle

```sh
npm ci
npm run typecheck && npm test && npm run lint   # all must pass
npm run build                                   # web assets -> dist/
npx cap sync android                            # copy into the Android project
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

Confirm it is signed with your key before uploading:

```sh
jarsigner -verify -verbose:summary app-release.aab | head -3
keytool -printcert -jarfile app-release.aab       # fingerprint should match your key
```

To smoke-test the exact artifact on a device, use
[bundletool](https://github.com/google/bundletool):

```sh
bundletool build-apks --bundle=app-release.aab --output=payweek.apks \
  --ks=payweek-upload.jks --ks-key-alias=payweek-upload --mode=universal
bundletool install-apks --apks=payweek.apks
```

## 3. Before every release

- Bump `versionCode` (must increase every upload) and `versionName` in
  `android/app/build.gradle`.
- Check `.env` points at the production Supabase project — the anon/publishable
  key is baked into the bundle at build time.
- In Supabase → **Auth → URL Configuration**, confirm `payweek://auth-callback`
  is in the redirect allowlist, or sign-in will fail on device.
- `minifyEnabled` and `shrinkResources` are on for release. If anything
  misbehaves only in release builds, suspect ProGuard first and add keep rules
  to `android/app/proguard-rules.pro`.

## 4. Play Console — first-time listing setup

1. **Create app** — name "Payweek: Hours & Pay Tracker", English (UK), App,
   Free.
2. **App content** (all required before any release can roll out):
   - Privacy policy URL: `https://payweek-self.vercel.app/privacy.html` — **live now**. Swap to
     `https://payweek.app/privacy.html` once that domain is attached.
   - Ads: **No**
   - App access: all functionality requires a sign-in, so provide reviewer
     credentials — create a real account with a mailbox you control and give
     the email and its magic-link inbox access, or add a demo account with a
     password. Reviewers cannot receive your magic-link emails otherwise.
   - Content rating questionnaire → expect **PEGI 3 / Everyone** (a utility
     with no user-generated content sharing)
   - Target audience: 18+ (working adults)
   - Data safety: see [DATA_SAFETY.md](DATA_SAFETY.md)
   - Government apps: No · Financial features: **No** — Payweek tracks hours
     and estimates gross pay; it does not handle money, loans or payments
3. **Store listing** — short description, full description, app icon (512×512),
   feature graphic (1024×500), and at least 2 phone screenshots. Assets:
   `assets/icon.png` is the source art; screenshots can be captured from a
   device or emulator.

## 5. Closed testing track

1. **Testing → Closed testing → Create track** (the default "Alpha" is fine).
2. **Testers**: create an email list, or a Google Group. Every tester must
   accept the opt-in link before they can install.
3. Upload the AAB, add release notes, **Review release** → **Start rollout**.
4. Share the opt-in URL from the track's *Testers* tab. Installs go through
   Play as normal once opted in.
5. First review of a new app usually takes a few days; closed-testing updates
   after that are typically faster.

Google requires a sustained closed test before a **personal** developer account
can go to production (currently 12 testers opted in for 14 continuous days).
Organisation accounts are exempt. Check the current rule in Console before
planning the production date.

## 6. Rollback

Play cannot un-publish a release, only supersede it. Keep the previous AAB so
you can bump `versionCode` and re-upload the older build if a release goes
wrong. Halting a rollout stops it reaching further testers but does not remove
it from those who already installed.

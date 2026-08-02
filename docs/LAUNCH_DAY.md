# What's left, in order

Everything already done is at the bottom. This is only what still needs you,
ordered so nothing waits on anything above it.

Two steps have waiting built in — **Step 4** and **Step 10**. Start those early
and do the others while they run.

---

## ~~Step 1 — The privacy contact address~~ ✅ DONE

`privacy@payweek.app` is live on Google Workspace. Verified from Vercel's
authoritative nameserver:

```
MX   1 smtp.google.com
TXT  google-site-verification=sChVyn_ri5HRdQzQUwlsZ4UJJEjYj3T5yFjMZHSE32c
TXT  v=spf1 include:_spf.google.com ~all
A    64.29.17.65, 216.198.79.1   (unchanged — the site was never affected)
```

Nothing in the repo needed changing: the policy, the app and the Play
paperwork have said `privacy@payweek.app` from the start.

> One loose end: send a real email to it and open it. DNS proves mail reaches
> Google; it cannot prove the `privacy@` user exists inside the tenant.

> When adding DNS records at Vercel for `payweek.app` itself, leave the
> **Name** field empty rather than typing `@`. Vercel saves `@` correctly but
> then rejects it as "wrong characters" if you reopen the field to edit.

---

## Step 2 — Check the maths against a real payslip (20 minutes) ← the important one

**Nothing else matters if this is wrong.** Everything below is packaging.

1. Open <https://payweek.app> and sign in
2. **Rates → Add agency** — your real agency, your real hourly rate. Tick
   **Night rate** and/or **Weekend rate** on the same screen and put your
   actual figures in
3. **Add** tab → log a week of shifts you already have the payslip for
4. **Payday** tab → compare that week's total against the payslip
5. **Shifts** → tap one → read *How this was worked out*

✅ **Go:** the total matches the payslip's gross, or you can account for the
difference — holiday pay is shown separately, and tax and NI are not modelled
at all, so compare against **gross**.
❌ **Stop:** if a figure is off, screenshot the breakdown and send it. Do not
carry on to the Play Store with wrong pay maths.

If sign-in fails with *"requested path is invalid"*, do Step 3 first.

---

## Step 3 — Confirm the Supabase redirect URLs (10 minutes)

This has never been verified — there is no API to read it, so it needs a human
looking at the dashboard. **Sign-in fails without it.**

Supabase → project `payweek` → **Authentication → URL Configuration**:

- Site URL → `https://payweek.app`
- Redirect URLs → must include `https://payweek.app/**` **and**
  `payweek://auth-callback` (the second is what returns you to the Android app)

Keep the existing `vercel.app` entries; extras are harmless.

✅ If Step 2 signed in fine, the web half is already right. The
`payweek://auth-callback` entry still needs checking before Step 6.

---

## Step 3b — Email sending, before you invite 12 testers ⚠️ blocks Step 10

The app now allows **3 sign-in links per email address every 10 minutes**, with
a live countdown, so nobody hammers the button into a rate limit and nobody
gets locked out by a link that landed in spam. That is the app's half.

Supabase's half is the one that will bite. Two things to look at:

**1. Custom SMTP — do this before Step 10.** Supabase's built-in email service
is a shared, heavily-capped convenience for development, not a mailer. Twelve
testers all signing in on the day you send the opt-in link will exhaust it,
and the failures look like the app is broken.

You already pay for a mail provider: **Google Workspace**. Using it means no
new account and no new DNS records.

Supabase → **Authentication → Emails → SMTP Settings** → **Enable custom
SMTP**, then:

| Field | Value |
| --- | --- |
| Sender email address | `privacy@payweek.app` |
| Sender name | `Payweek` |
| Host | `smtp.gmail.com` |
| Port number | `465` (already correct) |
| Minimum interval per user | `60` (already correct — it matches the app) |
| Username | `privacy@payweek.app` |
| Password | a Google **App Password**, not the account password |

> ⚠️ **Username must be an address you can sign into Gmail with** — a real
> user, not an alias. If `privacy@` is an alias on the main account, use the
> main Workspace address in *both* Username and Sender email address. Google
> rewrites the From header to whoever authenticated, so if the two disagree
> the sender field is simply ignored.

Getting the App Password — the normal password is blocked for SMTP:

1. Sign into Google as that address
2. <https://myaccount.google.com/security> → turn on **2-Step Verification**.
   App Passwords do not exist without it
3. <https://myaccount.google.com/apppasswords> → name it `Payweek Supabase`
   → **Create**
4. **Strip the spaces** when pasting. Google shows `abcd efgh ijkl mnop`;
   Supabase wants `abcdefghijklmnop`

> If the App Passwords page says it isn't available, it's off at the tenant
> level: Admin console → **Security → Authentication → 2-step verification**
> → tick **Allow users to turn on App Passwords**.

**2. The rate limits themselves.** Saving the above raises the cap to 30
emails an hour, which is tight for 12 testers retrying. Supabase →
**Authentication → Rate Limits** → set the hourly email limit to **100**.
Google's own ceiling is 2,000 a day, so nothing in closed testing gets near
it.

✅ Sign in at payweek.app and check the sender. `privacy@payweek.app` rather
than `noreply@mail.app.supabase.io` means it's done.

**If App Passwords turn out to be blocked**, use Resend instead — free, 3,000
emails a month. Sign up, add `payweek.app`, paste its three DNS records into
Vercel, then: Host `smtp.resend.com`, Port `465`, Username literally
`resend`, Password the `re_…` API key, Sender `noreply@payweek.app`.

> Same trap as before: when adding DNS records at Vercel for `payweek.app`
> itself, leave the **Name** field empty rather than typing `@`.

---

## Step 4 — Install Android Studio (10 min of work, 1 hour+ of downloading)

Start it, then go and do Steps 1–3 while it runs.

1. <https://developer.android.com/studio> → download → install
2. Launch it, accept the **default** setup wizard, let it finish completely

✅ Opens to a Welcome window with nothing pending.

---

## ~~Step 5 — Build the Android app~~ ✅ DONE — it compiles

Verified 2 August 2026 on Windows 11: **`BUILD SUCCESSFUL`**, a 4.8 MB debug
APK, 193 tasks. Gradle 8.9 · AGP 8.7.2 · compileSdk 35 · JDK 21 · Capacitor 6.

**No Capacitor 7 migration was needed** — the fallback in the old plan can be
ignored. The toolchain raised to meet Play's API 35 floor is now proven rather
than assumed, which was the single largest unknown left in this project.

Three things cost time, all machine setup rather than the app. They are
written up with fixes in [BUILD_ANDROID.md](BUILD_ANDROID.md):

1. **Java version.** Gradle 8.9 + AGP 8.7.2 need Java **17–21**. A Java 8 on
   PATH fails one way, a Java 25 fails another. Pin JDK 21 via
   `org.gradle.java.home` in `%USERPROFILE%\.gradle\gradle.properties`.
2. **`SDK location not found`** — write `sdk.dir` into `android/local.properties`.
3. **Wrong platform.** Android Studio's wizard installs the newest SDK
   (`android-37.0`), not 35. Add API 35 and Build-Tools 35 in the SDK Manager.

To rebuild after any code change:

```powershell
cd C:\dev\Payweek
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

---

## Step 6 — On your phone, and the two buttons never run for real (25 minutes)

On the phone: **Settings → About phone** → tap **Build number** seven times →
**Developer options** → turn on **USB debugging** → plug into the laptop → tap
**Allow**.

```sh
npx cap run android
```

✅ Payweek installs and opens. Sign in — open the magic-link email **on the
phone this time**. Your data from Step 2 is already there.

Then test the two things that have only ever been tested against a stub:

- **Export.** Settings → *Export my shifts as a spreadsheet*. The Android share
  sheet should appear with a CSV file.
- **Delete my account.** Sign in with a **throwaway Gmail**, add one agency,
  then Settings → **Delete my account** → type DELETE. It should sign you out
  and the account should be gone. **Throwaway only — this is irreversible.**
  Play requires this path to work.

---

## Step 7 — Create your signing key (5 minutes, once ever)

```sh
keytool -genkeypair -v \
  -keystore android/payweek-upload.jks \
  -alias payweek-upload \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Payweek, O=Payweek, C=GB"
```

Then create `android/keystore.properties`:

```
storeFile=payweek-upload.jks
storePassword=the-password-you-just-chose
keyAlias=payweek-upload
keyPassword=the-password-you-just-chose
```

🔐 **Back up `payweek-upload.jks` and the password now** — password manager, or
email the file to yourself. Lose them and you can never update the app again.
Neither file goes into Git; that is already set up.

---

## Step 8 — Build the file you upload (10 minutes)

```sh
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
```

(Windows: `gradlew bundleRelease`, no `./`)

✅ Creates `android/app/build/outputs/bundle/release/app-release.aab`.

---

## Step 9 — Screenshots and the listing (45 minutes)

With real data on the phone, screenshot these five:

1. **Add** tab — the pay-week total
2. **Shifts** — grouped by week
3. A shift's **How this was worked out**
4. **Rates** → an agency, night rate ticked
5. **Payday**

Play needs at least two; use all five. Already made for you in `assets/play/`:
`icon-512.png` (512×512) and `feature-graphic.png` (1024×500).

Play Console → **Create app**: *Payweek: Hours & Pay Tracker*, English (UK),
App, Free. Work through **App content** — every item needs a green tick:

| Item | Answer |
| --- | --- |
| Privacy policy | `https://payweek.app/privacy.html` |
| Ads | No |
| App access | ⚠️ see below |
| Content rating | Fill in the questionnaire → expect Everyone / PEGI 3 |
| Target audience | 18+ |
| Data safety | Copy from [DATA_SAFETY.md](DATA_SAFETY.md) — every answer is written out |
| Financial features | **No** |
| Government apps | No |

> ⚠️ **App access** is what trips people up. Payweek needs a login and the
> reviewer **cannot receive your magic-link emails**. Use the throwaway Gmail
> from Step 6: give Play that address plus the instruction *"Enter this email
> on the sign-in screen and open the emailed link."* If the reviewer can't get
> in, they reject the app.

Listing copy — title, short description, full description — is written for you
in [STORE_LISTING.md](STORE_LISTING.md).

---

## Step 10 — Closed testing (15 minutes, then a 14-day wait)

Personal developer accounts cannot publish straight to production. Google
requires a sustained closed test first — currently **12 testers opted in for
14 continuous days**. Organisation accounts are exempt; yours is personal.

> ⚠️ **Do Step 3b first.** Twelve people signing in on the same afternoon is
> exactly what exhausts Supabase's built-in email service.

1. **Testing → Closed testing → Create track** (the default "Alpha" is fine)
2. **Testers** → create an email list and add **12 Gmail addresses**
3. Upload `app-release.aab` → **Review release** → **Start rollout**
4. Copy the opt-in link from the **Testers** tab and send it to all 12

⚠️ **The count is opt-ins, not invitations.** A tester who never clicks the
link does not count, and the 14-day clock only advances on days when 12 are
opted in. If someone drops out on day 9, the clock does not simply pause —
chase them the same day.

⏱️ First review of a new app usually takes a few days. Updates to a closed
track after that are typically faster.

✅ **Testing → Closed testing** shows 12 testers and a running day count.

---

## Step 11 — While the 14 days run

Nothing here is urgent, but this is the only quiet window you will get.

- **Actually use it.** Log your own real shifts for two weeks. This is a
  better test than anything I can automate, because you will notice a wrong
  figure in a way a test never will.
- **Collect what testers say.** They will find the thing that is obvious to
  everyone but you — that is exactly what happened with the night rate.
- **Fix and re-upload freely.** Each new build needs `versionCode` bumped in
  `android/app/build.gradle` (1 → 2 → 3 …) and does not restart the 14 days.
- **Watch for crashes.** Play Console → **Quality → Android vitals**. There is
  no crash-reporting SDK in the app by design, so Vitals is your only view.

---

## Step 12 — Apply for production access

Once the 14 days are complete, Play Console shows a prompt to apply.

You will be asked, in writing, about:

- how you recruited testers and what feedback you got
- what you changed as a result
- who the app is for and why it is ready

Answer it properly — a thin answer gets bounced and costs you days. If you
kept notes in Step 11, this is twenty minutes.

⏱️ Google reviews the application. Expect days, not hours.

---

## Step 13 — Production rollout

1. **Production → Create new release**
2. Upload the AAB (bump `versionCode` again if you have rebuilt since)
3. **Countries / regions** — United Kingdom at minimum; the app is built
   around UK pay, holiday accrual at 12.07% and £ only
4. Release notes — plain English, what it does
5. **Review release → Start rollout to production**

Consider a **staged rollout** (20%) for the first release, so a serious bug
reaches a fraction of users while you fix it.

✅ Payweek is on Google Play.

---

## Step 14 — After it is live

| When | What |
| --- | --- |
| Day 1 | Install it from Play yourself, on a phone that never had the debug build |
| Weekly | Check **Android vitals** for crashes and ANRs |
| Every update | Bump `versionCode`, and keep the Data safety form true — see [DATA_SAFETY.md](DATA_SAFETY.md) |
| If you ever add analytics or crash reporting | You **must** update the Data safety declaration first. Shipping without is a policy violation |
| Annually | Google re-confirms developer identity; keep the account details current |

---

## If you get stuck

| What you see | What it means |
| --- | --- |
| `command not found` | Close the terminal, open a new one |
| "Missing VITE_SUPABASE_URL" | `.env` is missing or in the wrong folder |
| "requested path is invalid" on sign-in | Step 3 |
| "Try again in 7 minutes" on the sign-in button | Normal. Three links per address per 10 minutes; the link is already in an inbox or a spam folder |
| A tester says no email ever arrived | Step 3b — the built-in sender has run out |
| Gradle complains about Capacitor or SDK 35 | Step 5's fallback: `npx @capacitor/cli@7 migrate` |
| `SDK location not found` | Android Studio hasn't finished its first-run setup |
| Sign-in link does nothing on the phone | You opened the email on a different device |
| **A pay figure looks wrong** | **Stop. Send me the breakdown screenshot.** |

---

## Already done — don't touch these

| | |
| --- | --- |
| Play account | Created and verified |
| Database | Live in London, 5 tables, RLS on every one, advisors clean |
| Website | payweek.app over HTTPS, redeploys on every push, proper desktop layout |
| Privacy policy | Written, live, and matching the app's design |
| Account deletion | In-app, backed by the `delete-account` Edge Function (deployed, ACTIVE) |
| Rate engine | 79 tests — night, weekend, midnight-crossing shifts, breaks priced in the band they actually fall in |
| Offline | Shifts log with no signal and sync on reconnect (verified) |
| Play blockers in code | targetSdk 35, backups disabled, in-app deletion — all handled |
| App icon & splash | Generated for every Android density |
| Signing config | Wired — Step 7 only supplies the key |
| Play paperwork | Data safety answers and listing copy written |

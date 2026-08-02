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

## Step 4 — Install Android Studio (10 min of work, 1 hour+ of downloading)

Start it, then go and do Steps 1–3 while it runs.

1. <https://developer.android.com/studio> → download → install
2. Launch it, accept the **default** setup wizard, let it finish completely

✅ Opens to a Welcome window with nothing pending.

---

## Step 5 — Build once, immediately, before anything else ⚠️ never compiled

> **Full walkthrough: [BUILD_ANDROID.md](BUILD_ANDROID.md)** — every command,
> what each error means, and the three device tests that have never been run on
> real hardware. The summary below is the short version.

The Android toolchain moved and **has not been built by anyone yet**. Play will
not accept a new app below API 35, so `targetSdk`/`compileSdk` are now 35,
which forced Android Gradle Plugin 8.7.2 and Gradle 8.9. None of that could be
compiled in my environment — `dl.google.com` is blocked there.

Find out now, not after you have done the store listing:

```sh
git clone https://github.com/patrykwrld/Payweek.git
cd Payweek
git checkout claude/payweek-app-zk4tcb
npm install
```

Create a file called `.env` in the `Payweek` folder:

```
VITE_SUPABASE_URL=https://jcwxxtimhrlzaojadmhx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_PXDZo1oea43av5x4lIj3lg_1vGP_8AI
VITE_PRIVACY_URL=https://payweek.app/privacy.html
```

Then:

```sh
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

✅ It compiles.
❌ If Gradle complains about the Capacitor modules or the SDK, run
`npx @capacitor/cli@7 migrate` — Capacitor 7 targets SDK 35 natively — then
build again. If it still fails, send me the error text.

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

# What's left, in order

Everything already done is at the bottom. This is only what still needs you,
ordered so nothing waits on anything above it.

**Step 10** has a 14-day wait built in. Everything before it is work you
control, so the whole plan is really "get to Step 10 quickly".

Next up: **Step 3c** — rebuild the APK, because the sign-in path has changed
since the one on your phone was built.

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

## ~~Step 3 — Confirm the Supabase redirect URLs~~ ✅ DONE

**Authentication → URL Configuration** carries `payweek://auth-callback`,
confirmed 2 August 2026. That is the entry that returns you to the Android app
after a magic link, and there is no API to read it — it needed a human looking
at the dashboard.

---

## ~~Step 3b — Email sending~~ ✅ DONE — custom SMTP is on

Auth emails now go out through Google Workspace as `privacy@payweek.app`,
name `Payweek`, via `smtp.gmail.com:465` with an App Password. Google allows
2,000 messages a day, so 12 testers signing in is not close to a limit.

Supabase warns that Gmail is a personal rather than transactional mailer.
That is about deliverability at volume and is fine for a closed test; if
Payweek gets real traction, move to Resend (Host `smtp.resend.com`, Port
`465`, Username literally `resend`, Password the `re_…` API key) and send as
`noreply@payweek.app`.

The **Minimum interval per user** was left at 60 seconds deliberately — it is
the same number the sign-in screen counts down against, so the two agree
rather than the app promising something the server then refuses.

<details>
<summary>The original setup instructions, kept in case it ever needs redoing</summary>

Supabase → **Authentication → Emails → SMTP Settings** → **Enable custom
SMTP**:

| Field | Value |
| --- | --- |
| Sender email address | `privacy@payweek.app` |
| Sender name | `Payweek` |
| Host | `smtp.gmail.com` |
| Port number | `465` |
| Minimum interval per user | `60` |
| Username | `privacy@payweek.app` |
| Password | a Google **App Password**, not the account password |

> ⚠️ **Username must be an address you can sign into Gmail with** — a real
> user, not an alias. Google rewrites the From header to whoever
> authenticated, so if Username and Sender disagree, Sender is ignored.

The App Password: sign into Google as that address →
<https://myaccount.google.com/security> → turn on **2-Step Verification** (App
Passwords don't exist without it) → <https://myaccount.google.com/apppasswords>
→ create one → **strip the spaces** when pasting.

Then Supabase → **Authentication → Rate Limits** → hourly email limit to
**100**. Enabling custom SMTP only raises it to 30 on its own.

</details>

---

## Step 3c — Rebuild before you sign anything ⚠️ do this first (15 minutes)

Your working APK was built on 2 August. Everything since then has touched the
**sign-in path**, which is the one thing that must not be broken in the file
you upload to Google:

- a real **Sign out** button in Settings
- **3 sign-in links per address every 10 minutes**, with a live countdown
- **Keep me signed in**, which moves where the session token is stored

```powershell
cd C:\dev\Payweek
git pull origin claude/payweek-app-zk4tcb
npm install
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Install `android\app\build\outputs\apk\debug\app-debug.apk` on your phone the
same way you did last time, then check three things:

1. **Sign in still works.** Open the magic-link email on the phone. It should
   now arrive from `privacy@payweek.app` rather than Supabase — that proves
   Step 3b at the same time.
2. **Settings → Sign out.** It's a proper button now, under your email address.
3. **Sign back in with "Keep me signed in" ticked**, then close Payweek
   completely and reopen it. You should still be signed in.

❌ **Stop if sign-in fails.** Send me what the screen says. Do not build a
release from a build you haven't signed into.

---

## ~~Step 4 — Install Android Studio~~ ✅ DONE

Installed on Windows 11 with SDK Platform 35, Build-Tools 35 and JDK 21
pinned. Step 5 proved it works.

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

## Step 6 — The two buttons that have never run for real (25 minutes)

The app itself is installed and working on your phone. These two have only
ever been exercised against a local stand-in, and **Play requires the second
one to work** — a reviewer will try it.

- **Export.** Settings → *Export my shifts as a spreadsheet*. The Android
  share sheet should open with a CSV file. (Log a shift first; it refuses to
  export nothing.)
- **Delete my account.** ⚠️ Sign in with a **throwaway Gmail**, not your real
  account. Add one agency, then Settings → **Delete my account** → type
  `DELETE`. It should sign you out, and signing back in should give an empty
  account. **This is irreversible.**

Keep that throwaway address — it becomes the reviewer login in Step 9.

---

## Step 7 — Create your signing key (5 minutes, once ever)

Windows (PowerShell). `keytool` ships with the JDK 21 you pinned in Step 5,
so this finds it rather than relying on PATH:

```powershell
$jdk = (Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory | Where-Object Name -like "jdk-21*" | Select-Object -First 1).FullName
& "$jdk\bin\keytool.exe" -genkeypair -v `
  -keystore C:\dev\Payweek\android\payweek-upload.jks `
  -alias payweek-upload `
  -keyalg RSA -keysize 4096 -validity 10000 `
  -dname "CN=Payweek, O=Payweek, C=GB"
```

It asks for a password, twice. Choose one and write it down before you type
it. If it then asks for a *key* password as well, press Enter to reuse the
same one — that is what the config below expects.

macOS / Linux:

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

```powershell
cd C:\dev\Payweek
npm run build
npx cap sync android
cd android
.\gradlew.bat bundleRelease
```

(macOS / Linux: `./gradlew bundleRelease`)

✅ Creates `android/app/build/outputs/bundle/release/app-release.aab`.

> If it produces an **unsigned** bundle, `keystore.properties` wasn't found.
> It has to sit in `android/`, next to `gradlew.bat` — not in the project root.

⚠️ **Test the release build before you upload it.** Release runs ProGuard and
resource shrinking; debug doesn't. That is the one way a build can be fine on
your phone and broken in the store. An `.aab` can't be installed directly, so
build the equivalent APK — same signing, same shrinking — and put that on your
phone:

```powershell
.\gradlew.bat assembleRelease
```

→ `android\app\build\outputs\apk\release\app-release.apk`. Install it, sign
in, log a shift, export. If all three work, the bundle is good.

> Capacitor ships its own ProGuard rules that keep the plugin classes, so
> this is expected to pass. Check it anyway — the failure mode is a button
> that silently does nothing, and a reviewer would find it before you did.

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

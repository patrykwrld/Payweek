# What's left, in order

Ordered so nothing waits on anything above it. **Step 10** has a 14-day wait
built into it, so the whole plan is really "get to Step 10 quickly".

## Where you are

| | Step | State |
| --- | --- | --- |
| 1 | Privacy contact address | ✅ `privacy@payweek.app` live on Workspace |
| 2 | Check the maths against a real payslip | ✅ **matched to the penny** |
| 3 | Supabase redirect URLs | ✅ `payweek://auth-callback` in place |
| 3b | Custom SMTP for auth email | ✅ Google Workspace, `privacy@payweek.app` |
| 3d | **Auth settings in Supabase** | ⬜ **next** — three toggles, five minutes |
| 3c | **Rebuild the APK** | ⬜ the phone build predates usernames, passwords, sign-out and the link limit |
| 4 | Android Studio + SDK 35 | ✅ installed, JDK 21 pinned |
| 5 | Prove the Android build compiles | ✅ `BUILD SUCCESSFUL`, 4.8 MB debug APK |
| 6 | Export + Delete account on real hardware | ✅ both verified on a phone, 3 Aug |
| 7 | Signing key | ⬜ 5 minutes, once ever |
| 8 | Build the `.aab` you upload | ⬜ test the release APK first |
| 9 | Screenshots + store listing | ⬜ copy is already written for you |
| 10 | Closed testing — 12 testers, 14 days | ⬜ the long pole |
| 11 | Use it and collect feedback | ⬜ runs during the 14 days |
| 12 | Apply for production access | ⬜ |
| 13 | Production rollout | ⬜ |
| 14 | After it's live | ⬜ |

**Three of those need you and nothing else: Step 3d, Step 3c and Step 6** —
in that order. About 45 minutes together, all doable in one sitting with your
phone in your hand, and they are the last things standing between you and a
signed upload.

The big one is behind you: **the pay maths matches a real payslip exactly.**

Everything on the app side is finished — the rate engine, offline, the intro,
account deletion, the website, the Play paperwork. That list is at the bottom.

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

## ~~Step 2 — Check the maths against a real payslip~~ ✅ DONE — it matches

Checked 3 August 2026 against a real week, on a phone. Six shifts in the week
ending Sunday 2 August:

| | | |
| --- | --- | --- |
| Tue 28 Jul | 17:00–02:00 · 8h | £115.57 |
| Thu 30 Jul | 17:00–04:00 · 10h | £146.60 |
| Fri 31 Jul | 17:00–02:00 · 8h | £115.66 |
| Sat 1 Aug | 17:00–00:45 · 7h 15m | £103.51 |
| Sun 2 Aug | 17:00–02:00 · 8h | £115.57 |
| Sun 2 Aug | 17:00–01:00 · 7h | £100.00 |
| | **Total** | **£696.91** |

**£696.91 on the payslip, £696.91 from the hours.** Night bands, a Friday
running into Saturday, a shift ending at 00:45 and two shifts on the same
Sunday — all priced correctly, to the penny.

This was the one step where a bad answer would have changed the shape of the
project. It didn't.

> The £0.30 discrepancy on screen was a mistyped `696.61` in the box, not a
> difference in the maths. That typo did expose a real bug, now fixed: the
> money fields accepted any number of digits, and a third decimal place made
> the whole verdict silently disappear.

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

## Step 3d — Three auth settings in Supabase (5 minutes) ⚠️ do this first

How signing in works now, in one paragraph, because these settings only make
sense against it:

> **Registering** asks for a username, an email and a password, and sends one
> email. Opening that email drops the person straight into Payweek, already
> signed in, with banknotes falling past a "You're in". **After that there are
> no more emails.** They sign in with their username and password. The email
> address exists so a forgotten password can be reset — nothing else.

Supabase → **Authentication → Sign In / Providers → Email**:

| Setting | Set it to | Why it has to be this |
| --- | --- | --- |
| **Confirm email** | ✅ **On** | This is the setting that *makes* the flow. The confirmation email **is** the link that finishes registration and carries the person into the app. With it off, no email is ever sent and the whole welcome never happens |
| **Minimum password length** | **8** | The app refuses anything shorter. A lower number is a promise the app doesn't keep; a higher one refuses passwords the app just accepted |
| ~~Leaked password protection~~ | **Leave it off** | Supabase gates this behind the **Pro plan at $25/month**, and it is **not** a Play requirement. Payweek now does the same check itself, for nothing — see below. The advisor warning about it can be ignored |

> ⚠️ **This reverses what an earlier version of this document said.** It told
> you to turn *Confirm email* off, which was right when the email link was a
> way to *sign in* and being asked to confirm was pure friction. Now the link
> is the last step of *registering* — turning it off removes the email
> entirely and there is nothing to open.

✅ **Check:** register a throwaway account at payweek.app. You should get an
email from `privacy@payweek.app`; opening it should land you inside the app
with the notes falling.

### The leaked-password check, without the $25

Supabase only offers it on Pro. Rather than pay for one toggle, Payweek does
it directly against the same source, in `src/lib/pwnedPassword.ts`:

- When a password is chosen — registering, resetting, or changing it in
  Settings — the app takes a SHA-1 hash **on the device** and sends only the
  **first five characters** to Have I Been Pwned's range API.
- The reply is several hundred breached hashes sharing that prefix. The
  comparison happens locally. The service never learns the password, the full
  hash, or who was asking. This is HIBP's documented k-anonymity model.
- A hit is refused with the count: *"That password has appeared in known data
  breaches 24,231,000+ times."*
- It **fails open** on a timeout, an outage or an old WebView. A third party
  having a bad day must never be why somebody can't register.

Twelve tests cover it, including one asserting that what goes over the wire is
exactly five characters and nothing else. The privacy policy describes it.

> Three warnings under **Advisors → Security** are expected and should be left
> alone. One is *Leaked Password Protection Disabled*, which is the Pro
> feature above, now handled in the app instead. They say `public.username_available` is a `SECURITY DEFINER` function
> anyone can call. It is, on purpose — a registration form has to answer "is
> this username taken?" before there is any session to ask with. It returns a
> boolean and nothing else, so the most it discloses is whether a handle is in
> use, which is inherent to having usernames at all. Turning a username into
> an email address needs the service role and happens only inside the
> `username-signin` Edge Function.

---

## Step 3c — Rebuild the app on your phone (15 minutes)

### What this is, and why it exists

Payweek is a web app in an Android wrapper. The APK does **not** fetch the
site — it carries a frozen copy of it inside, in `android/app/src/main/assets`.
So the app on your phone is not "Payweek"; it is *Payweek as it stood on the
afternoon of 2 August*. Pushing to GitHub updates payweek.app within a minute
and does nothing at all to the phone.

Three commands, in this order, are what move new code into the APK:

| | |
| --- | --- |
| `npm run build` | Compiles the web app into `dist/` |
| `npx cap sync android` | Copies `dist/` into the Android project's assets |
| `gradlew assembleDebug` | Packages those assets into an installable APK |

Miss the first two and Gradle rebuilds happily — around the **old** web app.
That is the trap: `BUILD SUCCESSFUL` tells you nothing about whether your
changes are in it.

### What you'd be missing

Everything since 2 August has touched the **sign-in path**, which is the one
thing that must not be broken in the file you send to Google:

- **A new way in altogether.** Registering asks for a username, an email and
  a password and sends one email; opening it lands you inside the app with
  banknotes falling past a "You're in". After that it is username and password
  — **the sign-in screen no longer offers an email link at all**
- **Forgotten your password**, with a reset link and a screen to set a new one
- **Settings → Signing in**, so your existing magic-link account can claim a
  username and a password
- a real **Sign out** button in Settings — your tester couldn't find the old one
- **3 sign-in links per address every 10 minutes**, with a live countdown
- **Keep me signed in**, which changes where the session token is stored
- opening with no signal and nothing cached no longer pulses grey blocks forever
- money fields now refuse a third decimal place instead of silently dropping
  the answer

### Do it

```powershell
cd C:\dev\Payweek
git pull origin claude/payweek-app-zk4tcb
npm install
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Install `android\app\build\outputs\apk\debug\app-debug.apk` the same way you
did last time — Android will offer to update the existing app, and your data
stays. Then check three things:

1. **Register** with a username, an email you can open **on the phone**, and
   a password. You should land on *One step left*.
2. **Open the email on the phone.** It should come from `privacy@payweek.app`
   — which confirms Step 3b at the same time — and tapping the link should
   drop you into Payweek with the notes falling. This is the moment to check;
   it is the first thing every new user will see.
3. **Settings → Sign out**, then sign back in with the username and password.
   No email. This is the path every tester and the Play reviewer will take.
4. **Settings → Signing in** on your own older account — claim a username and
   set a password, then sign out and back in with them.
5. **Keep me signed in** ticked, close Payweek completely, reopen — still in.

✅ Quickest proof the rebuild took: the sign-in screen asks for **Username or
email** *and* a password, and there is **no** "Email me a sign-in link"
button. If either is wrong, the old assets are still in the package.

❌ **Stop if sign-in fails.** Send me what the screen says. Never build a
release from a build you haven't signed into yourself.

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

### ~~Delete my account~~ ✅ WORKS — verified 3 August on a phone

It signed the account out and removed it. Play actively tests this path, so
this was a real blocker rather than a nice-to-have.

It failed twice first, and the reason is worth keeping because it will look
like a network fault if it ever comes back:

> supabase-js sends an `X-Client-Info` header on every request. The function's
> `Access-Control-Allow-Headers` didn't list it, so the browser's preflight
> **passed on the server and failed on the client** — the function logged a
> clean `OPTIONS | 200` and the POST was never sent. The app faithfully
> reported a network failure for a server that had answered perfectly.
>
> Fixed in v3 by echoing `Access-Control-Request-Headers` back rather than
> listing them, so it cannot recur when supabase-js next adds a header.

Deleting the account also removed the shifts behind the Step 2 payslip check.
That's fine — the figures are written into Step 2 above — but signing back in
gives an empty account, so the agency and rates need adding again.

### Export — still to tick

Settings → *Export my shifts as a spreadsheet*. The Android share sheet should
open with a CSV file. Log a shift first; it refuses to export nothing.

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

🔐 **Back up `payweek-upload.jks` and the password now** — password manager,
or email the file to yourself. Neither file goes into Git; `.gitignore`
already covers both, and that has been checked.

What losing it actually costs, accurately: this is the **upload** key, not the
key Google signs the app with. New apps are enrolled in **Play App Signing**,
so if you lose this one you can ask Google to register a replacement — days of
waiting and a support thread, not the end of the listing. Before your first
upload it costs nothing at all: delete it and run the command again.

That is still worth avoiding, and losing the password is the more common way
it happens. Put both somewhere you will still have them in three years.

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

The welcome screen with the notes falling makes a strong first tile if you
want a sixth — screenshot it while registering the reviewer account, because
it only appears once per account.

Play needs at least two; use all five. Already made for you in `assets/play/`:
`icon-512.png` (512×512) and `feature-graphic.png` (1024×500).

Play Console → **Create app**: *Payweek: Hours & Pay Tracker*, English (UK),
App, Free. Work through **App content** — every item needs a green tick:

| Item | Answer |
| --- | --- |
| Privacy policy | `https://payweek.app/privacy.html` |
| **Account deletion URL** | `https://payweek.app/delete-account.html` — ⚠️ **required**, see below |
| Ads | No |
| App access | ⚠️ **see below — likeliest cause of rejection** |
| Content rating | Fill in the questionnaire → expect Everyone / PEGI 3 |
| Target audience | 18+ |
| Data safety | Copy from [DATA_SAFETY.md](DATA_SAFETY.md) — every answer is written out |
| Financial features | **No** |
| Government apps | No |

### ⚠️ The account deletion URL is a rejection trap

Any app that lets people create an account has to give Play a **web page**,
reachable by somebody who has already uninstalled the app, that explains how
to delete the account. The in-app button is necessary and **not sufficient** —
this is a separate field on the Data safety form and apps get rejected for
leaving it out.

`https://payweek.app/delete-account.html` is that page. It is written, live,
and deliberately plain HTML that needs nothing from the app bundle, so it
still works for someone who has uninstalled.

### App access — a reviewer needs a way in

Payweek shows nothing without a login, so Play requires you to hand the
reviewer working credentials. Since Step 3d this is straightforward: **make
them an account with a username and a password.**

> An earlier version of this document said to give Play an email address and
> tell the reviewer to open the emailed link. That would have been rejected —
> the reviewer cannot open your inbox. Usernames exist partly to remove that
> problem, and a Google account with 2FA turned off is no longer needed either.

1. On the phone or at payweek.app, **Create an account**: username
   `payweek_review`, any email **you** can open, a password you don't use
   anywhere else
2. **Open the confirmation email yourself and finish the registration.** This
   matters: the reviewer will never see an email, so the account has to be
   fully confirmed before you hand it over. Once it is, signing in needs
   nothing but the username and password
3. Add one agency and log two or three shifts, so the reviewer sees a working
   app rather than an empty state and can find the deletion path
4. In **App access** → *All or some functionality is restricted* → add:

   > Username: payweek_review
   > Password: (the password)
   >
   > Enter these on the sign-in screen and tap **Sign in**. No email or
   > confirmation step is needed.

5. Sign out and sign back in with those exact details, on a device that has
   never held that session, before you submit. That is the only way to know a
   reviewer can

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
| Account deletion page | `payweek.app/delete-account.html` — the web route Play requires alongside the in-app one |
| Sign-in | Username + password, or Google. Username→email resolution happens in the `username-signin` Edge Function so nobody's address is exposed |
| Account deletion | In-app, backed by the `delete-account` Edge Function (ACTIVE, v3). **Read the comment at the top of the function before redeploying it** — the CORS header echo and `verify_jwt = false` are both load-bearing and both look optional |
| Rate engine | Night, weekend, midnight-crossing shifts, breaks priced in the band they actually fall in |
| Offline | Shifts log with no signal and sync on reconnect (verified) |
| Play blockers in code | targetSdk 35, backups disabled, in-app deletion — all handled |
| App icon & splash | Generated for every Android density |
| Signing config | Wired — Step 7 only supplies the key |
| Play paperwork | Data safety answers and listing copy written |
| Tests | 136, all passing |

### Added since the APK on your phone was built

This is what Step 3c picks up. All of it came from someone actually using it.

| | |
| --- | --- |
| **Sign out** | Was a grey underline below the fold that the first person to look for it couldn't find. Now a button under your email address, and it asks twice if shifts are still queued to sync |
| **3 sign-in links per address per 10 minutes** | Live countdown on the form and on the "check your inbox" panel, plus a resend button so a lost link doesn't mean retyping your address. A send that failed on a flat signal costs nobody an attempt |
| **Keep me signed in** | Ticked by default. Unticked, the session dies when Payweek closes — for a shared or work computer |
| **Offline first-run** | Opening with no signal and nothing cached used to pulse grey blocks forever. It now says what has happened |
| **Money fields** | Accepted any number of digits, and a third decimal place made the payslip verdict vanish with no explanation. They now hold only what a money amount can be |
| **Usernames and passwords** | Creating an account asks for a username, an email and a password, and ends on a screen that shows the username back with a Sign in button. Signing in takes either the username or the email |
| **Password resets** | A forgotten password can't mean losing months of shifts. Reset link, and a screen to set a new one — including on Android, where the link arrives as an ordinary sign-in and needs telling apart |
| **Settings → Signing in** | Everyone so far signed up with a magic link and has neither a username nor a password. This is where they claim both |
| **The welcome** | Opening the registration email lands you inside the app with banknotes falling past a "You're in". Compositor-only, so it stays smooth on a cheap phone, and it holds still under reduced-motion |
| **No more sign-in links** | The email link belongs to registration now. Signing in is username and password |

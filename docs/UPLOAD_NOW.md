# Upload to Play — the whole sitting, in order

Everything needed for one session at the Windows machine. Follow it top to
bottom; nothing here needs a decision made on the spot.

**What's being uploaded:** version **1.1.0**, versionCode **3**.

Corrected 21 Sep from a screenshot of the Play Console release screen: the
bundle live on the closed track is **versionCode 2 (1.0.1), target SDK 36** —
not versionCode 1, and not a stale target. So this upload is a UI update
rather than a compliance fix, and it is **not urgent**. The four reworked
screens are not in front of testers yet, but nothing is broken or blocked by
that.

> **versionCode 3 is required, not just cautious.** I had assumed 2 was built
> but never uploaded; the release screen shows version 2 (1.0.1) sitting in
> the previous release, so 2 is used and 3 is the first free number. If Play
> refuses 3 as well, bump to 4 in `android/app/build.gradle` and rebuild —
> that is the only thing that error ever means.

---

## Before you start — the one that actually breaks builds

**`.env` must exist in the project root before you run `npm run build`.**

Vite bakes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` into the bundle at
build time. Without the file the build still **succeeds** — it just produces an
app that throws on launch and shows a blank screen. There is no warning, no
failed step, and you would not find out until a tester opened it.

Check it:

```powershell
cd C:\dev\Payweek
type .env
```

You want to see all three lines:

```
VITE_SUPABASE_URL=https://jcwxxtimhrlzaojadmhx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_PXDZo1oea43av5x4lIj3lg_1vGP_8AI
VITE_PRIVACY_URL=https://payweek.app/privacy.html
```

If it's missing, create it with exactly those three lines. The publishable key
is safe in the client — RLS is what protects the data.

---

## Step 1 · Build (about 10 minutes)

```powershell
cd C:\dev\Payweek
git pull origin claude/payweek-app-zk4tcb
npm install
npm run build
npx cap sync android
cd android
.\gradlew.bat clean
.\gradlew.bat bundleRelease
.\gradlew.bat assembleRelease
```

**`npm run build`, never `npm run vercel-build`.** The vercel one swaps the
landing page over `index.html`, and Capacitor loads `index.html` from the
bundle — you would ship the marketing page as the app. Verified on this side:
after `cap sync`, `android\app\src\main\assets\public\index.html` has the title
*"Payweek — Hours & Pay Tracker"*. If it says *"know what you're owed before
payday"* you ran the wrong build; redo from `npm run build`.

✅ **`BUILD SUCCESSFUL` twice**, and two files exist:

```
android\app\build\outputs\bundle\release\app-release.aab
android\app\build\outputs\apk\release\app-release.apk
```

❌ *Keystore was tampered with, or password was incorrect* → the password in
`android\keystore.properties` doesn't match the key. Rewrite that file and
rerun.

❌ *A file called `app-release-unsigned.apk`* → `keystore.properties` is in the
wrong folder. It goes in `C:\dev\Payweek\android\`, beside `gradlew.bat`.

## Step 2 · Check it runs before Play sees it

Install the APK on your own phone and open it. You are checking one thing:
**does it get past the sign-in screen**. A blank or instantly-closing app is
the missing-`.env` failure, and it is far better to find it here.

```powershell
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

No adb? Copy the APK to the phone and tap it.

> **Never confirm a closed-testing release with no bundle in it.** The create
> screen lists the previous release's bundle under *Not included* and will let
> you proceed with nothing attached, which takes the app away from the testers
> you already have. Either upload the new `.aab`, or use **Add from library**
> to carry version 2 forward — or discard the draft. An empty release is the
> one destructive thing on that page.

## Step 3 · Upload the bundle

Play Console → **Test and release → Testing → Closed testing** → your track →
**Create new release**.

1. Upload `app-release.aab`
2. **Release name:** `1.1.0 (3)`
3. **Release notes** — paste this into the `en-GB` box:

```
What's new

• The home screen now shows what each day of the week earned, not just the week total — tap any bar to see that day.
• Tap a shift to see exactly how its pay was worked out: base rate, nights, weekends, and where the break came off.
• Payday is now a timeline — what's coming, what's landed, and what came up short.
• Faster shift logging, and a clock-in that survives closing the app.

Found something wrong? Reply to the tester email — it all gets read.
```

4. **Review release → Start rollout to Closed testing**

## Step 4 · Refresh the store listing while you're in there

Three of the six screenshots on the listing still show the August UI. All six
have been regenerated at exactly 1080×1920 and are in
`assets\play\screenshots\` after the `git pull`.

Play Console → **Grow → Store presence → Main store listing** → **Phone
screenshots** → remove the old six, upload these in this order:

| # | File | Shows |
| --- | --- | --- |
| 1 | `1-week-total.png` | the week total and the per-day bars |
| 2 | `2-how-it-was-worked-out.png` | a midnight shift split across two rates |
| 3 | `3-night-weekend-rates.png` | the rates screen |
| 4 | `4-shifts-by-week.png` | shifts grouped by pay week |
| 5 | `5-payday.png` | the Payday timeline |
| 6 | `6-payslip-check.png` | "You're £30.00 short" |

Order matters — Play shows the first two or three in search results, so
somebody scrolling past learns what it is from tile 1 and why it is different
from tile 2.

**Save** at the bottom, or nothing you just did is kept.

## Step 5 · Tell the testers

The ones who installed in August are sitting on a build that looks nothing like
this. Play updates them automatically, but most people won't notice unless told:

> Pushed a fairly big update — the home screen shows what each day earned now,
> and you can tap any shift to see exactly how the pay was worked out. Should
> update itself within a few hours. Let me know if anything looks wrong.

---

## What this does not fix

**The 12-tester gate is unchanged.** Uploading a new build doesn't add testers
and doesn't restart anything — the count is people opted in, and the clock is
14 continuous days. Check where that number actually stands while you're in
Play Console: there are 22 accounts in the database, so it is genuinely
possible you are already past twelve and the tester post can come out of the
rota entirely.

**Nothing has been checked against a real payslip yet.** Zero payslip checks
across 22 accounts. The screenshot you are about to make tile 6 of the listing
shows a feature no real user has ever reached. It is still the right thing to
lead with — it is the reason to install — but it is worth a nudge on the Payday
screen before this goes public.

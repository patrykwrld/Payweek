# Launch day — start here

Everything already done is listed at the bottom. This is only what's left, in
the order that wastes the least time. Each step says how long it takes and how
you know it worked.

**Two steps have waiting built in (Play verification, Android Studio download).
Start those early and do other things while they run.**

---

## Step 1 — Start the Play developer account (5 min, then wait days)

Do this **first**, before coffee. Google has to verify your identity and that
takes 1–3 days; everything else can happen while the clock runs.

1. Go to <https://play.google.com/console/signup>
2. Sign up as **Yourself** (personal), pay the **$25** one-off fee
3. Upload ID when asked

✅ You'll see "Verification in progress". That's all you need for now — come
back to Play at Step 9.

> ⚠️ Personal accounts must run a closed test with **12 testers for 14
> continuous days** before going public. Line up 12 people (mates, family,
> anyone with an Android phone) — you'll need their Gmail addresses at Step 10.
>
> ⚠️ Also install the **Play Console mobile app** on your Android phone and
> sign in — new personal accounts must prove they have a real device before
> they can publish.
>
> 📄 Full detail, with sources, in [GOOGLE_VERIFICATION.md](GOOGLE_VERIFICATION.md)
> — including the 30 Sept 2026 Android developer verification deadline and why
> you can skip Google OAuth verification.

---

## Step 2 — Check the maths (20 min) ← the important one

**Nothing else matters if this is wrong.** You're checking that Payweek
calculates your real pay correctly.

1. Open **<https://payweek-self.vercel.app>** on your laptop
2. Enter your email → **Email me a sign-in link** → open the email on the same
   device → click the link
3. **Agencies → Add** — your real agency, your real base rate
4. **Add rule** — your actual night / weekend / overtime rules
   (e.g. From `22:00` To `06:00`, tap Mon–Fri, rate `14.50`)
5. **Add** tab → log a shift you already know the pay for
6. **Shifts** tab → tap it → read the breakdown

✅ **Go:** the total matches your own arithmetic (or your last payslip).
❌ **Stop:** if any figure is off, screenshot the breakdown and send it to me.
Do not carry on to the Play Store with wrong pay maths.

If sign-in fails with "requested path is invalid", the Supabase redirect URL
needs another look — screenshot the address bar and send it.

---

## Step 3 — Buy payweek.app and attach it (20 min)

Easiest route, because it configures DNS for you automatically:

1. <https://vercel.com> → your **payweek** project → **Settings → Domains**
2. Type `payweek.app` → **Buy** (about £15/year) → complete checkout
3. Vercel attaches it and issues the HTTPS certificate itself

(If you'd rather buy elsewhere — Namecheap, Cloudflare — buy there, then in
Vercel use **Add Domain** and copy the DNS records it shows into your
registrar. Slower, ~£3 cheaper.)

✅ <https://payweek.app> loads Payweek, with a padlock in the address bar.
Certificates can take up to an hour — don't panic if it's not instant.

### Then update three things

1. **Vercel** → payweek → Settings → Environment Variables → add:
   `VITE_PRIVACY_URL` = `https://payweek.app/privacy.html`
   Then **Deployments → ⋯ → Redeploy** on the latest one.
2. **Supabase** → project `payweek` → Authentication → URL Configuration:
   - Site URL → `https://payweek.app`
   - Redirect URLs → add `https://payweek.app/**`
   (Keep the vercel.app entries and `payweek://auth-callback` — extras are fine.)
3. Your privacy policy address becomes `https://payweek.app/privacy.html`.

---

## Step 4 — Decide the privacy contact email (5 min)

The privacy policy currently says `privacy@payweek.app`, which doesn't exist
yet. Google requires a working address. Pick one:

- **Simplest:** change it to an email you already read. Tell me which and I'll
  edit `public/privacy.html` and push — it redeploys automatically.
- **Tidier:** set up free forwarding from `privacy@payweek.app` to your inbox.
  Cloudflare Email Routing does this free, but you'd need the domain's DNS on
  Cloudflare (so buy the domain there in Step 3 rather than at Vercel).

✅ Send a test email to whichever address you chose and confirm it arrives.

---

## Step 5 — Install Android Studio (10 min setup, 1 hour+ downloading)

Start this and go do something else.

1. <https://developer.android.com/studio> → download for your OS → install
2. Launch it, accept the **default** setup wizard, let it finish completely

✅ It opens to a "Welcome to Android Studio" window with no pending downloads.

---

## Step 6 — Get the app on your phone (20 min)

On your phone:
1. **Settings → About phone** → tap **Build number** 7 times
2. **Settings → System → Developer options** → turn on **USB debugging**
3. Plug it into the laptop → tap **Allow** on the phone

On the laptop, in a terminal:
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
npx cap run android
```

✅ Payweek installs and opens on your phone. Sign in — open the magic-link
email **on the phone this time**. Your agency and shift from Step 2 are
already there.

---

## Step 7 — Create your signing key (5 min, do it once ever)

In the `Payweek` folder:
```sh
keytool -genkeypair -v \
  -keystore android/payweek-upload.jks \
  -alias payweek-upload \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Payweek, O=Payweek, C=GB"
```
It asks you to invent a password. Then create
`android/keystore.properties`:
```
storeFile=payweek-upload.jks
storePassword=the-password-you-just-chose
keyAlias=payweek-upload
keyPassword=the-password-you-just-chose
```

🔐 **Back up `payweek-upload.jks` and the password now** — password manager,
or email the file to yourself. Lose them and you can never update the app
again. Neither file goes into Git; that's already set up.

---

## Step 8 — Build the file you upload (10 min)

```sh
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
cd ..
```
(Windows: `gradlew bundleRelease`, no `./`)

✅ Creates `android/app/build/outputs/bundle/release/app-release.aab`.
First run takes a few minutes while Gradle downloads things.

---

## Step 9 — Take screenshots (15 min)

With the app on your phone (Step 6), screenshot these five — they need real
data in them, which you now have:

1. **Add** tab (the pay-week total)
2. **Shifts** (grouped by week)
3. A shift's **breakdown** ("How this was worked out")
4. The **rule builder** with the live preview
5. **Payslip check**

Email them to yourself to get them onto the laptop. Play needs at least 2; use
all five.

**Already made for you** (in the repo at `assets/play/`):
- `icon-512.png` — the 512×512 store icon
- `feature-graphic.png` — the 1024×500 banner

---

## Step 10 — Fill in the Play listing (45 min)

Play Console → **Create app**: name **Payweek: Hours & Pay Tracker**,
English (UK), App, Free.

Work through **App content** — every item needs a green tick:

| Item | Answer |
| --- | --- |
| Privacy policy | `https://payweek.app/privacy.html` |
| Ads | No |
| App access | ⚠️ See below |
| Content rating | Fill in the questionnaire → expect Everyone / PEGI 3 |
| Target audience | 18+ |
| Data safety | Copy from [DATA_SAFETY.md](DATA_SAFETY.md) — every answer is listed |
| Financial features | **No** |
| Government apps | No |

> ⚠️ **App access** trips people up. Payweek needs a login, and the reviewer
> **cannot receive your magic-link emails**. Create a throwaway Gmail, sign in
> to Payweek with it once, then give Play that email address plus instructions:
> *"Enter this email on the sign-in screen and open the emailed link."* If the
> reviewer can't get in, they reject the app.

**Store listing** — all the wording is written for you in
[STORE_LISTING.md](STORE_LISTING.md): title, short description, full
description. Upload the icon, feature graphic and screenshots.

---

## Step 11 — Send it to testers (15 min)

1. **Testing → Closed testing → Create track**
2. **Testers** → add your 12 testers' Gmail addresses
3. Upload `app-release.aab` → **Review release** → **Start rollout**
4. Copy the opt-in link from the **Testers** tab and send it to all 12 —
   **they must click it and accept before they can install**

⏱️ First review usually takes a few days. Then the 14-day clock starts, and it
only counts days where 12 testers are opted in — so chase anyone who hasn't
accepted.

---

## If you get stuck

| What you see | What it means |
| --- | --- |
| `command not found` | Close the terminal, open a new one |
| "Missing VITE_SUPABASE_URL" | The `.env` file is missing or in the wrong folder |
| "requested path is invalid" on sign-in | Supabase redirect URL doesn't match the address you're on |
| `SDK location not found` | Android Studio hasn't finished its first-run setup |
| Sign-in link does nothing on phone | You opened the email on a different device |
| **A pay figure looks wrong** | **Stop and send me the breakdown screenshot** |

---

## Already done — you don't need to touch these

| | |
| --- | --- |
| Database | Live in London, all 5 tables, RLS on every one, security advisors clean |
| Web app | Live at payweek-self.vercel.app, redeploys automatically on every push |
| Privacy policy | Written and live |
| Rate engine | 34 tests passing — night rates, weekends, daily/weekly overtime, midnight-crossing shifts, break apportioning |
| Offline mode | Shifts log with no signal and sync on reconnect (verified) |
| App icon & splash | Generated for every Android screen density |
| Signing config | Wired — Step 7 just supplies the key |
| Play paperwork | Data safety answers and listing copy written |

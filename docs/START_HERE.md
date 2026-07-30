# Start here — Payweek, step by step

Plain instructions from a fresh computer to the app on your phone, then to
Google Play. Do the parts in order. Each step says what you should see, so you
know it worked before moving on.

---

## Part A — Run it on your computer (~15 minutes)

### 1. Install the two things you need

- **Node.js 22** — https://nodejs.org (choose the LTS download)
- **Git** — https://git-scm.com/downloads

Check they installed. Open Terminal (Mac) or PowerShell (Windows) and type:

```sh
node -v
git --version
```

✅ You should see a version number for each. If "command not found", restart
the terminal and try again.

### 2. Download the code

```sh
git clone https://github.com/patrykwrld/Payweek.git
cd Payweek
git checkout claude/payweek-app-zk4tcb
npm install
```

✅ Ends with something like "added 400 packages". Takes a minute or two.

### 3. Add your Supabase keys

Create a file called `.env` in the `Payweek` folder containing exactly this:

```
VITE_SUPABASE_URL=https://jcwxxtimhrlzaojadmhx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_PXDZo1oea43av5x4lIj3lg_1vGP_8AI
```

(This is the Payweek database that is already set up and live.)

### 4. Turn on sign-in

Go to https://supabase.com/dashboard → project **payweek** → **Authentication**
→ **URL Configuration**:

- **Site URL**: `http://localhost:5173`
- **Redirect URLs**: click Add and enter `payweek://auth-callback`
- Click **Save**

✅ Without this, sign-in on the phone will fail later.

### 5. Start it

```sh
npm run dev
```

Open http://localhost:5173 in your browser.

✅ You should see the Payweek sign-in screen. Enter your email, click **Email
me a sign-in link**, then open that email **on this computer** and click the
link. You're in.

### 6. Try it out

1. **Agencies** tab → **Add** → enter your agency's name and base rate → **Add agency**
2. On the agency → **Add rule** → e.g. From 22:00 To 06:00, tap Mon–Fri, rate
   14.50 → watch the preview at the bottom update → **Add rule**
3. **Add** tab → fill in a shift → **Log shift**
4. **Shifts** tab → tap the shift → see exactly how the pay was worked out

✅ If the number matches what you'd expect from your own agency's rules, the
app is working correctly. **Stop here and tell me if any figure looks wrong** —
that's the most important thing to check before going further.

To stop the app, press `Ctrl + C` in the terminal.

---

## Part B — Put it on your phone

### 7. Install Android Studio

Download from https://developer.android.com/studio and install it. On first
launch accept the default setup — it downloads the Android SDK, which is what
actually builds the app.

⏱️ This is a big download (several GB). Let it finish completely.

### 8. Connect your phone

1. On your phone: **Settings → About phone** → tap **Build number** seven times
   (this turns on Developer options)
2. **Settings → System → Developer options** → turn on **USB debugging**
3. Plug the phone into the computer with a USB cable
4. On the phone, tap **Allow** when it asks about USB debugging

### 9. Build and install it

Back in the `Payweek` folder:

```sh
npm run build
npx cap sync android
npx cap run android
```

✅ Payweek installs and opens on your phone. Sign in the same way — but open
the magic-link email **on the phone**, not the computer.

---

## Part C — Publish to Google Play

Only do this once Part B works and you're happy with the app.

### 10. Things you need first

- **A Google Play developer account** — https://play.google.com/console
  (one-off $25 fee, takes a day or two to verify)
- **A real email address for privacy questions** — set up
  `privacy@payweek.app`, or change the address in `public/privacy.html` to one
  you actually read
- ~~The privacy policy online~~ — **done**. It is live at
  <https://payweek.app/privacy.html>, which is the address to give Google Play.

### 11. Create your signing key

This is what proves updates come from you. Run this once, in the `Payweek`
folder:

```sh
keytool -genkeypair -v \
  -keystore android/payweek-upload.jks \
  -alias payweek-upload \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Payweek, O=Payweek, C=GB"
```

It asks you to invent a password — write it down somewhere safe.

Then create a file `android/keystore.properties`:

```
storeFile=payweek-upload.jks
storePassword=the-password-you-just-chose
keyAlias=payweek-upload
keyPassword=the-password-you-just-chose
```

⚠️ **Back up `payweek-upload.jks` and the password.** If you lose them you can
never update the app again. Neither file goes into Git — that's already
configured.

### 12. Build the file you upload

```sh
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
cd ..
```

(On Windows use `gradlew bundleRelease` without the `./`)

✅ Creates the file
`android/app/build/outputs/bundle/release/app-release.aab`. That's what you
upload.

### 13. Set up the Play listing

In Play Console → **Create app**:

- App name: **Payweek: Hours & Pay Tracker**
- Language: English (UK) · Type: App · Free

Then work through **App content** — Google won't let you release until every
item has a green tick:

| Item | What to answer |
| --- | --- |
| Privacy policy | Your public link to `privacy.html` |
| Ads | No |
| App access | All features need a login — create a test account and give Google the details, or they can't review it |
| Content rating | Fill in the questionnaire (it's a utility — expect Everyone/PEGI 3) |
| Target audience | 18+ |
| Data safety | Copy the answers from `docs/DATA_SAFETY.md` |
| Financial features | **No** |

Then **Store listing** — the wording to paste is in `docs/STORE_LISTING.md`.
You'll also need an app icon, a 1024×500 banner, and 2+ screenshots taken on
your phone.

### 14. Send it to testers

1. **Testing → Closed testing → Create track**
2. **Testers** → add the email addresses of people testing it
3. Upload `app-release.aab` → **Review release** → **Start rollout**
4. Copy the opt-in link from the Testers tab and send it to your testers — they
   must click it before they can install

⏱️ First review usually takes a few days.

⚠️ If your developer account is a **personal** one (not a company), Google
currently requires 12 testers to stay opted in for 14 days in a row before you
can go public. Worth starting that clock early.

---

## If something goes wrong

| Problem | Fix |
| --- | --- |
| `command not found` | Close and reopen the terminal |
| App shows "Missing VITE_SUPABASE_URL" | The `.env` file is missing, misnamed, or in the wrong folder |
| Sign-in link doesn't work on the phone | Step 4 wasn't done, or you opened the email on a different device |
| `SDK location not found` | Android Studio isn't installed or hasn't finished its first-run setup |
| A pay figure looks wrong | Tap the shift to see the breakdown, then send me a screenshot — don't work around it |

More detail lives in `docs/RELEASE.md`.

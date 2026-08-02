# Building the Android app, step by step

Written for someone who has never built an Android app. Every command is
copy-paste, and every step says how you know it worked.

**Do this before the Play listing, not after.** The Android toolchain was
raised to meet Play's API 35 floor and has never been compiled — `dl.google.com`
is blocked in the environment where the code was written, so this is the first
time anyone runs it. If something is wrong, you want to find out now.

**Time:** ~30 minutes of your attention, plus 1–2 hours of downloading you can
walk away from.

---

## What you are installing, and why

| Piece | Why it's needed |
| --- | --- |
| **Node 20.19+ or 22.12+** | Builds the web app that goes inside the Android shell |
| **Android Studio** | Brings the Android SDK and a bundled Java 21 |
| **SDK Platform 35** | Play will not accept a new app below API 35 |
| **Build-Tools 35** | Compiles and packages |
| **Platform-Tools** | `adb`, which talks to your phone |

Gradle installs itself — the repo carries a wrapper pinned to 8.9, so you never
install Gradle by hand.

---

## Step 1 — Install Node (10 min)

Download the **LTS** build from <https://nodejs.org> and install it with the
defaults.

Open a **new** terminal (PowerShell on Windows, Terminal on macOS) and check:

```sh
node -v
npm -v
```

✅ `node -v` prints **v20.19.0 or higher**, or **v22.12.0 or higher**.
❌ "command not found" means the terminal was open before you installed —
close it, open a new one.

---

## Step 2 — Install Android Studio (10 min of clicking, 1 hour+ of downloading)

1. <https://developer.android.com/studio> → download for your OS
2. Install and launch it
3. Accept the **Standard** setup wizard and let it run to the end — it is
   fetching several GB

✅ You reach the "Welcome to Android Studio" window with no progress bars.

You will not write any code in Android Studio. It is here for the SDK.

---

## Step 3 — Add SDK Platform 35 (5 min)

The wizard may not install exactly 35, and 35 is the one Play requires.

1. Android Studio → **More Actions** (or **Customize**) → **SDK Manager**
2. **SDK Platforms** tab → tick **Show Package Details**
3. Tick **Android 15.0 ("VanillaIceCream") — API Level 35**
4. **SDK Tools** tab → tick **Show Package Details** → make sure you have:
   - **Android SDK Build-Tools 35.x**
   - **Android SDK Platform-Tools**
   - **Android SDK Command-line Tools (latest)**
5. **Apply** → accept the licences → wait

✅ Both tabs show API 35 and Build-Tools 35 as *Installed*.

While you're here, note the **Android SDK Location** at the top of the SDK
Manager. You may need it in Step 6.

---

## Step 4 — Get the code (5 min)

```sh
git clone https://github.com/patrykwrld/Payweek.git
cd Payweek
git checkout claude/payweek-app-zk4tcb
npm install
```

✅ `npm install` finishes with no red `ERR!` lines. Warnings are fine.

---

## Step 5 — Create the `.env` file

The build reads three values from a file called `.env` in the **`Payweek`
folder itself** — not in `android/`, not in `src/`. It is gitignored on
purpose, which is why cloning doesn't bring it.

Create `Payweek/.env` containing exactly:

```
VITE_SUPABASE_URL=https://jcwxxtimhrlzaojadmhx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_PXDZo1oea43av5x4lIj3lg_1vGP_8AI
VITE_PRIVACY_URL=https://payweek.app/privacy.html
```

> On Windows, Notepad will try to save it as `.env.txt`. In the Save dialog set
> **Save as type: All Files** and type the name as `.env`.

⚠️ The third line matters: without it the in-app **Privacy policy** button on
Android points at the wrong address, and Play checks that.

✅ Check it is being read:

```sh
npm run build
```

Finishes with `✓ built in …` and creates a `dist` folder. If you see
*"Missing VITE_SUPABASE_URL"*, the file is misnamed or in the wrong folder.

---

## Step 6 — Point the build at the SDK

Gradle needs to know where the SDK is. Usually Android Studio has already told
it. Try the build first (Step 7) — if it fails with **`SDK location not
found`**, come back and create `Payweek/android/local.properties`:

```
# macOS
sdk.dir=/Users/YOUR-NAME/Library/Android/sdk

# Windows — note the DOUBLE backslashes
sdk.dir=C\:\\Users\\YOUR-NAME\\AppData\\Local\\Android\\Sdk

# Linux
sdk.dir=/home/YOUR-NAME/Android/Sdk
```

Use the exact path the SDK Manager showed you in Step 3.

---

## Step 7 — The build ⚠️ this is the real test

**First, always, in the `Payweek` folder** — these three make the thing Gradle
then compiles. Skipping them builds an empty or stale app:

```sh
npm run build          # builds the web app into dist/
npx cap sync android   # copies dist/ into the Android project
```

Now pick either route. They produce the identical APK.

---

### Route A — Android Studio (recommended if you just installed it)

Android Studio ships its own Java 21, so this route cannot hit a Java-version
problem. From the `Payweek` folder:

```sh
npx cap open android
```

That launches Android Studio **on the `android` folder**, which is the part
that matters.

> ⚠️ Do not use *File → Open* on the `Payweek` folder. The Android project is
> `Payweek/android`. Opening the parent gives you a project Android Studio
> cannot build, and it is the single most common way to lose an hour here.

Then:

1. Wait for **Gradle sync** — a progress bar bottom-right, several minutes the
   first time while it downloads Gradle 8.9 and the Android plugin. Let it
   finish. Errors before it completes are usually just "not finished yet".
2. Menu → **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Wait for the notification **"APK(s) generated successfully"**, then click
   **locate** in it to open the folder.

✅ You get `android/app/build/outputs/apk/debug/app-debug.apk`.

If the sync fails, Android Studio shows the error in a **Build** panel at the
bottom with a clickable link. Copy that text — it is exactly what I need.

---

### Route B — Terminal

macOS / Linux:

```sh
cd android
./gradlew assembleDebug
```

Windows (PowerShell):

```powershell
cd android
.\gradlew.bat assembleDebug
```

The first run downloads Gradle 8.9 and the Android plugin — several minutes,
and it will look frozen. Leave it.

✅ **`BUILD SUCCESSFUL`**, and the same
`android/app/build/outputs/apk/debug/app-debug.apk`.

---

That APK existing is the whole point of this step: it proves the SDK-35
toolchain works and nothing else in the launch plan is at risk.

### If it fails

| Error contains | What to do |
| --- | --- |
| `SDK location not found` | Step 6 |
| `Failed to install the following SDK components` / `licences` | `sdkmanager --licenses` and accept all, or re-open SDK Manager and Apply |
| `Unsupported class file major version` / `Java version` | Android Studio → Settings → Build Tools → Gradle → **Gradle JDK** → pick the bundled **jbr-21** |
| `compileSdk 35 requires Android Gradle Plugin 8.6.0 or higher` | Shouldn't happen — the repo pins 8.7.2. Send me the full text |
| Anything naming `capacitor-android` or `capacitor-cordova` | Run the Capacitor 7 upgrade below |
| Anything else | Copy the whole error and send it to me |

**The Capacitor 7 upgrade**, only if the errors name Capacitor modules:

```sh
cd ..                 # back to the Payweek folder
npx @capacitor/cli@7 migrate
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

Capacitor 7 targets SDK 35 natively. This is the documented fallback and is
expected to work; commit the result if it does.

---

## Step 8 — Put it on your phone (15 min)

On the phone:

1. **Settings → About phone** → tap **Build number** seven times
2. **Settings → System → Developer options** → turn on **USB debugging**
3. Plug into the laptop with a cable that carries data (not a charge-only one)
4. Tap **Allow** on the phone when it asks about USB debugging

Back in the `Payweek` folder:

```sh
npx cap run android
```

✅ Payweek installs and opens on the phone.

If the phone isn't found, `adb devices` should list it. "unauthorized" means
you missed the **Allow** prompt — unplug, replug, watch the screen.

---

## Step 9 — Test the three things that have never run on real hardware

These have only ever been exercised against a local stand-in. Do them now,
not during Play review.

**1. Sign in.** Enter your email, then open the magic-link email **on the
phone**. Opening it on the laptop will not work — the sign-in is tied to the
device that asked.

> If you get *"requested path is invalid"*, Supabase → project `payweek` →
> Authentication → URL Configuration is missing `payweek://auth-callback`.
> Add it and try again.

**2. Export.** Settings → **Export my shifts as a spreadsheet**. The Android
share sheet should open with a CSV. (Log a shift first — it refuses to export
nothing.)

**3. Delete my account.** ⚠️ **Use a throwaway Gmail, not your real account.**
Sign in with it, add one agency, then Settings → **Delete my account** → type
`DELETE`. It should sign you out, and signing back in should give you an empty
account.

This is irreversible and Play requires it to work. Keep that throwaway address
— it becomes the reviewer account in the store listing.

---

## Step 10 — Report back

Tell me:

- `BUILD SUCCESSFUL` or the error text
- whether sign-in worked on the phone
- whether export and account deletion worked

Then it's Step 7 of [LAUNCH_DAY.md](LAUNCH_DAY.md) — the signing key — and the
release build.

---

## Reference — what this project pins

| | |
| --- | --- |
| Gradle | 8.9 (via the wrapper; verified working on JDK 21) |
| Android Gradle Plugin | 8.7.2 |
| compileSdk / targetSdk | 35 |
| minSdk | 23 (Android 6.0) |
| applicationId | `app.payweek` |
| versionCode / versionName | 1 / 1.0.0 |

`versionCode` must increase on every upload to Play, forever. It is still 1
because nothing has been uploaded yet.

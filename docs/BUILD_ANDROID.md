# Building the Android app, step by step

Written for someone who has never built an Android app. Every command is
copy-paste, and every step says how you know it worked.

> ✅ **Verified 2 August 2026** on Windows 11 — `BUILD SUCCESSFUL`, a 4.8 MB
> debug APK, 193 tasks. Gradle 8.9 · AGP 8.7.2 · compileSdk 35 · JDK 21 ·
> Capacitor 6. **No Capacitor 7 migration was needed.** Everything below is
> known to work; the three traps in *Java version* and *SDK platform* are the
> ones that actually cost time.

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

These three are what actually happened on the first real machine, in order.

**1. Java version — the most likely failure by far.**

Gradle 8.9 and AGP 8.7.2 need Java **17–21**. Anything older *or newer* fails,
with two different and unhelpful messages:

| Message | Means |
| --- | --- |
| `Dependency requires at least JVM runtime version 11. This build uses a Java 8 JVM` | An old Java is first on PATH |
| `Unsupported class file major version 69` | A Java **25** is first on PATH (69 = Java 25; 65 = 21, 61 = 17) |

Pin Gradle to a JDK 21 in your **user profile**, so it applies everywhere and
never lands in the repo:

```powershell
winget install --id EclipseAdoptium.Temurin.21.JDK -e --accept-package-agreements --accept-source-agreements
$jdk = (Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory | Where-Object Name -like "jdk-21*" | Select-Object -First 1).FullName
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.gradle" | Out-Null
Set-Content -Path "$env:USERPROFILE\.gradle\gradle.properties" -Encoding ascii -Value ("org.gradle.java.home=" + ($jdk -replace '\\','/'))
```

Then `.\gradlew.bat --stop` before rebuilding — the running daemon is on the
wrong Java and would be reused.

**2. `SDK location not found`.**

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
Set-Content -Path "C:\dev\Payweek\android\local.properties" -Encoding ascii -Value ("sdk.dir=" + ($sdk -replace '\\','/'))
```

**3. The SDK has the wrong platform.**

Android Studio's setup wizard installs whatever is *latest* — on the first real
run that was `android-37.0`, and the project needs **35**. `sdkmanager` is also
not installed by default, so use the GUI:

SDK Manager → **SDK Platforms** → tick *Show Package Details* → tick **API
Level 35**. Then **SDK Tools** → **Build-Tools 35.0.0** and **Command-line
Tools (latest)**, which spares you the GUI next time.

**Anything else** — copy the whole error and send it to me.

> A warning about a *corrupted `package.xml` in `emulator/`* is harmless. That
> is the emulator's own metadata; the build never reads it.

**The Capacitor 7 upgrade** — *not needed as of the verified build above, and
only relevant if a future AGP bump breaks the Capacitor 6 modules:*

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

## Putting an updated APK on your phone

You will do this every time you rebuild. Android treats it as an **update**,
not a fresh install, so **your data stays** — as long as the new APK is signed
with the same key as the one already on the phone.

> ⚠️ **Debug and release are signed with different keys.** A debug build will
> refuse to install over a release build and vice versa, with
> `App not installed` or `signatures do not match`. When you switch between
> them, uninstall the old one first — and remember that uninstalling takes the
> local data with it, so sync before you do (just open the app with signal).

### The simplest route — Google Drive

No cable, no developer options, and it works on any phone.

1. On the laptop, open
   `C:\dev\Payweek\android\app\build\outputs\apk\debug\`
2. Upload **`app-debug.apk`** to your Google Drive
3. On the phone, open the Drive app and tap the file
4. Android asks to allow installing from Drive — **Allow**, then **Install**
5. If it says *"App not installed"*, see the signing note above

### With a cable, if the phone is already set up for it

```powershell
cd C:\dev\Payweek
npx cap run android
```

Faster when it works, but it needs USB debugging on and the phone authorised.
If `adb devices` shows nothing, use the Drive route rather than fighting it.

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

# Upload to Play — the whole sitting, in PowerShell

Everything needed for one session at the Windows machine, top to bottom.
Nothing here needs a decision made on the spot.

**What's being uploaded:** version **1.2.0**, versionCode **3**.

**What Play currently has:** versionCode **2 (1.0.1)**, target SDK 36, on the
closed track. So 3 is the first free number and this is a UI update rather
than a compliance fix. If Play rejects 3 as already used, bump to 4 in
`android/app/build.gradle` and rebuild — that is the only thing that error
ever means.

> **PowerShell 5.1 does not support `&&`.** Windows ships 5.1 by default.
> Every block below is written as separate lines for that reason. Run each
> block and look at the output before the next one; do not paste the whole
> document in at once. Check with `$PSVersionTable.PSVersion`.

---

# Part 0 · The keystore, before anything else

Without this file you cannot ship an update to `app.payweek` — not now, not
ever, by any means. Do this part even if you are not going to build today.

## 0.1 · Find it

```powershell
Get-ChildItem -Path C:\ -Include *.jks,*.keystore -Recurse -File -ErrorAction SilentlyContinue |
  Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize
```

That sweeps the whole drive and takes a few minutes. The one you want is
almost certainly `payweek-upload.jks`. Also check the places a file gets
parked and forgotten:

```powershell
Get-ChildItem "$env:USERPROFILE\Downloads","$env:USERPROFILE\Desktop","$env:USERPROFILE\Documents" `
  -Include *.jks,*.keystore -Recurse -File -ErrorAction SilentlyContinue | Select-Object FullName
```

## 0.2 · Prove it is the right key

A keystore that is not the one Play knows about is no better than no keystore,
and the two look identical on disk. `keytool` ships with the JDK:

```powershell
$keytool = "$env:JAVA_HOME\bin\keytool.exe"
if (-not (Test-Path $keytool)) {
  $keytool = (Get-ChildItem "$env:LOCALAPPDATA\Programs\Android Studio\jbr\bin\keytool.exe" -ErrorAction SilentlyContinue).FullName
}
& $keytool -list -v -keystore C:\dev\Payweek\android\payweek-upload.jks -alias payweek-upload
```

It asks for the store password. Copy the **SHA-256** fingerprint it prints.

Then open **Play Console → your app → Test and release → Setup → App
signing**, and compare it against the **Upload key certificate** SHA-256.

- **They match** → this is the right file. Back it up now.
- **They don't** → it is a different key. Keep looking before you build.

## 0.3 · Back it up properly

Three copies, two of them not on this machine. The `.jks` is useless without
the passwords, so they travel together.

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Payweek-keystore-backup" | Out-Null
Copy-Item C:\dev\Payweek\android\payweek-upload.jks "$env:USERPROFILE\Payweek-keystore-backup\"
Copy-Item C:\dev\Payweek\android\keystore.properties "$env:USERPROFILE\Payweek-keystore-backup\"
```

A keystore is binary, which password managers will not take. Base64 turns it
into text you can paste into one:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\dev\Payweek\android\payweek-upload.jks")) |
  Set-Clipboard
```

That is now on your clipboard. Paste it into a password manager entry called
*Payweek upload key*, together with the store password, the key password and
the alias (`payweek-upload`). To restore it later:

```powershell
[IO.File]::WriteAllBytes("C:\dev\Payweek\android\payweek-upload.jks",
  [Convert]::FromBase64String((Get-Clipboard)))
```

Then put a copy on a USB stick or an encrypted drive. **Never email it, never
put it in the repo, never paste it into a chat** — anyone holding it and the
password can publish an update as you.

## 0.4 · If it is genuinely gone

Not fatal, *provided Play App Signing is on* — check the same App signing page.

- **Play App Signing enabled** → Google holds the real app signing key; yours
  was only the upload key. Play Console → Setup → App signing → **Request
  upload key reset**. Generate a new key with the `keytool` command in
  `docs/RELEASE.md` §1, send them the new certificate, and carry on. Takes a
  couple of days.
- **Not enabled** → `app.payweek` can never be updated by anyone. The only
  route is a new package name, which is a new listing with zero installs and
  no testers. This is why Part 0 comes first.

---

# Part 1 · Get the machine ready

## 1.1 · The repo

```powershell
cd C:\dev\Payweek
git fetch origin claude/payweek-app-zk4tcb
git checkout claude/payweek-app-zk4tcb
git pull origin claude/payweek-app-zk4tcb
```

No `C:\dev\Payweek`? Clone it:

```powershell
New-Item -ItemType Directory -Force -Path C:\dev | Out-Null
cd C:\dev
git clone https://github.com/patrykwrld/Payweek.git Payweek
cd C:\dev\Payweek
git checkout claude/payweek-app-zk4tcb
```

## 1.2 · `.env` — the one that breaks builds silently

Vite bakes these into the bundle at build time. **Without the file the build
still succeeds** — it just produces an app that throws on launch and shows a
blank screen. No warning, no failed step, and you would not find out until a
tester opened it.

```powershell
Get-Content C:\dev\Payweek\.env
```

Nothing there? Create it:

```powershell
@"
VITE_SUPABASE_URL=https://jcwxxtimhrlzaojadmhx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_PXDZo1oea43av5x4lIj3lg_1vGP_8AI
VITE_PRIVACY_URL=https://payweek.app/privacy.html
"@ | Set-Content -Encoding utf8 C:\dev\Payweek\.env
```

The publishable key is safe in the client — RLS is what protects the data.

## 1.3 · `keystore.properties`

Only if missing. It sits in `android\`, beside `gradlew.bat`:

```powershell
@"
storeFile=payweek-upload.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=payweek-upload
keyPassword=YOUR_KEY_PASSWORD
"@ | Set-Content -Encoding utf8 C:\dev\Payweek\android\keystore.properties
```

## 1.4 · Check the tools are there

```powershell
node --version      # want v22.x
java -version       # want 21
$PSVersionTable.PSVersion
```

---

# Part 2 · Build

```powershell
cd C:\dev\Payweek
npm ci
```

Then the checks. **If any of these fail, stop** — do not ship it:

```powershell
npm run typecheck
npm test
npm run lint
```

Then the build:

```powershell
npm run build
npx cap sync android
```

> **`npm run build`, never `npm run vercel-build`.** The vercel one swaps the
> landing page over `index.html`, and Capacitor loads `index.html` from the
> bundle — you would ship the marketing page as the app.

Verify that, before Gradle touches it:

```powershell
Select-String -Path android\app\src\main\assets\public\index.html -Pattern "<title>"
```

Want *"Payweek — Hours & Pay Tracker"*. If it says *"know what you're owed
before payday"* you ran the wrong build; redo from `npm run build`.

Then compile:

```powershell
cd C:\dev\Payweek\android
.\gradlew.bat clean
.\gradlew.bat bundleRelease
.\gradlew.bat assembleRelease
```

✅ **`BUILD SUCCESSFUL` twice**, and both files exist:

```powershell
Get-ChildItem app\build\outputs\bundle\release\app-release.aab,
              app\build\outputs\apk\release\app-release.apk |
  Select-Object Name, Length, LastWriteTime
```

❌ *Keystore was tampered with, or password was incorrect* → the password in
`android\keystore.properties` doesn't match the key. Rewrite it and rerun.

❌ *A file called `app-release-unsigned.apk`* → `keystore.properties` is in the
wrong folder. It goes in `C:\dev\Payweek\android\`, beside `gradlew.bat`.

---

# Part 3 · Run it before Play sees it

Install the APK on your own phone and open it. You are checking one thing:
**does it get past the sign-in screen.** A blank or instantly-closing app is
the missing-`.env` failure, and it is far better to find it here.

```powershell
adb install -r C:\dev\Payweek\android\app\build\outputs\apk\release\app-release.apk
```

No adb? Copy the APK to the phone and tap it.

While it is open, check the four things that changed:

- the tab bar has **four** tabs — Week, Shifts, Payday, Setup
- the week bars carry **£ figures** above them
- **Payday** leads with a week to check, if one is due
- **Shifts** has the colour legend **above** the list

---

# Part 4 · Upload

> **Never confirm a closed-testing release with no bundle in it.** The create
> screen lists the previous release's bundle under *Not included* and will let
> you proceed with nothing attached, which takes the app away from the testers
> you already have. Either upload the new `.aab`, or use **Add from library**
> to carry version 2 forward — or discard the draft.

Play Console → **Test and release → Testing → Closed testing** → your track →
**Create new release**.

1. Upload `android\app\build\outputs\bundle\release\app-release.aab`
2. **Release name:** `1.2.0 (3)`
3. **Release notes**, into the `en-GB` box:

```
What's new

• Four tabs instead of five, and the home screen is down to one main button.
• Every day of the week now shows what it earned, right on the bars — you can see which nights were worth doing without tapping anything.
• Payday now asks about the week that's just been paid, with the figure already worked out. Type in what you actually got and it tells you the difference.
• The colours under each shift have a key now, so you can see which hours were paid at which rate.
• Setting up for the first time is one screen instead of three.
• The night the clocks go back is now nine hours, not eight — worth checking your payslip for that one.
• Security and stability fixes.

Found something wrong? Reply to the tester email — it all gets read.
```

> **Do not put the security detail in the release notes.** They are public
> the moment the release goes out, and the people who have not updated yet
> are the ones a description would help. "Security and stability fixes" is
> the line; the advisory number goes in the commit, where it already is.

4. **Review release → Start rollout to Closed testing**

---

# Part 5 · Refresh the store listing

All six screenshots were regenerated against the new UI and are in
`assets\play\screenshots\` after the `git pull`. The listing is currently
showing a five-tab app that no longer exists.

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

Order matters — Play shows the first two or three in search results.

**Save** at the bottom, or nothing you just did is kept.

---

# Part 6 · Tell the testers

```
Pushed a fairly big update. The home screen shows what each day earned now,
Payday asks about the week that's just been paid so checking a payslip is two
taps, and setting up is one screen. Should update itself within a few hours —
let me know if anything looks wrong.
```

---

## What this does not fix

**The 12-tester gate is unchanged.** Uploading doesn't add testers and doesn't
restart anything — the count is people opted in, and the clock is 14
continuous days. Check where that number actually stands while you are in Play
Console.

**Growth is the real blocker.** 24 accounts, one new in the last fortnight,
two active in the last week. This release makes the app better for whoever
arrives; it does not make anyone arrive.

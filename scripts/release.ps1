<#
.SYNOPSIS
  Everything between a fresh checkout and a signed bundle ready to upload.

.DESCRIPTION
  Written to be run unattended — from a phone, over a remote session, by
  somebody who cannot watch the output scroll past. So every step either
  passes loudly or stops the script; nothing continues after a failure, and
  the summary at the end says exactly what to do next.

  It deliberately stops short of uploading to Play. See docs/UPLOAD_NOW.md
  Part 4 for why, and for the four clicks that finish the job.

.PARAMETER RepoPath
  Where the checkout lives. Default C:\dev\Payweek.

.PARAMETER Branch
  Branch to build. Default claude/payweek-app-zk4tcb.

.PARAMETER SkipBackup
  Skip the keystore backup. Don't.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File C:\dev\Payweek\scripts\release.ps1
#>
param(
  [string]$RepoPath = 'C:\dev\Payweek',
  [string]$Branch   = 'claude/payweek-app-zk4tcb',
  [switch]$SkipBackup
)

$ErrorActionPreference = 'Stop'

function Step([string]$Name) {
  Write-Host ''
  Write-Host "── $Name " -ForegroundColor Cyan -NoNewline
  Write-Host ('─' * [Math]::Max(0, 60 - $Name.Length)) -ForegroundColor DarkGray
}

function Ok([string]$Msg)   { Write-Host "  OK    $Msg" -ForegroundColor Green }
function Info([string]$Msg) { Write-Host "  ..    $Msg" -ForegroundColor Gray }
function Warn([string]$Msg) { Write-Host "  WARN  $Msg" -ForegroundColor Yellow }

function Die([string]$Msg, [string]$Fix) {
  Write-Host ''
  Write-Host "  STOP  $Msg" -ForegroundColor Red
  if ($Fix) { Write-Host "        $Fix" -ForegroundColor Yellow }
  Write-Host ''
  exit 1
}

# Native commands set $LASTEXITCODE rather than throwing, so every external
# call has to be checked by hand or the script sails past a failed build.
function Run([string]$Exe, [string[]]$Args, [string]$Fix) {
  Info "$Exe $($Args -join ' ')"
  & $Exe @Args
  if ($LASTEXITCODE -ne 0) { Die "$Exe exited $LASTEXITCODE" $Fix }
}

Write-Host ''
Write-Host 'Payweek release build' -ForegroundColor White
Write-Host "  repo   $RepoPath"
Write-Host "  branch $Branch"

# ── 0 · the machine ────────────────────────────────────────────────────
Step 'Prerequisites'
if (-not (Test-Path $RepoPath)) {
  Die "No checkout at $RepoPath" "git clone https://github.com/patrykwrld/Payweek.git $RepoPath"
}
Set-Location $RepoPath

foreach ($t in 'node', 'npm', 'git') {
  if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Die "$t is not on PATH" '' }
}
Ok "node $(node --version)"

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  Die 'java is not on PATH' 'Install JDK 21, or open the Android Studio terminal which bundles one.'
}
$sdk = $env:ANDROID_HOME; if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) { $sdk = "$env:LOCALAPPDATA\Android\Sdk" }
if (-not (Test-Path $sdk)) {
  Die 'No Android SDK found' 'Install it via Android Studio, then set ANDROID_HOME.'
}
Ok "Android SDK at $sdk"

# ── 1 · the keystore ───────────────────────────────────────────────────
# First, because without it none of the rest is worth doing: an unsigned
# bundle cannot be uploaded, and a lost key cannot be replaced.
Step 'Signing key'
$propsPath = Join-Path $RepoPath 'android\keystore.properties'
if (-not (Test-Path $propsPath)) {
  Die 'android\keystore.properties is missing' 'See docs/UPLOAD_NOW.md Part 1.3.'
}
$props = @{}
Get-Content $propsPath | Where-Object { $_ -match '^\s*[^#].*=' } | ForEach-Object {
  $k, $v = $_ -split '=', 2
  $props[$k.Trim()] = $v.Trim()
}
$jks = Join-Path $RepoPath "android\$($props['storeFile'])"
if (-not (Test-Path $jks)) {
  Die "Keystore not found at $jks" 'docs/UPLOAD_NOW.md Part 0 finds it, or recovers it.'
}
Ok "keystore $($props['storeFile'])  alias $($props['keyAlias'])"

$keytool = "$env:JAVA_HOME\bin\keytool.exe"
if (-not (Test-Path $keytool)) {
  $keytool = (Get-Command keytool -ErrorAction SilentlyContinue).Source
}
if ($keytool -and (Test-Path $keytool)) {
  # Print the fingerprint so it can be eyeballed against Play Console's
  # upload certificate. A keystore that is not the one Play knows about is
  # indistinguishable from the right one until the upload is rejected.
  $out = & $keytool -list -v -keystore $jks -alias $props['keyAlias'] `
                    -storepass $props['storePassword'] 2>&1
  if ($LASTEXITCODE -ne 0) {
    Die 'Could not open the keystore' 'The password in keystore.properties does not match the key.'
  }
  # Select-String returns nothing when keytool's output format shifts, and
  # .ToString() on nothing throws — which would fail the run over a cosmetic
  # check. Take the first match if there is one and carry on if there isn't.
  $shaLine = $out | Select-String 'SHA256:' | Select-Object -First 1
  if ($shaLine) {
    Ok $shaLine.ToString().Trim()
    Write-Host '        Compare with Play Console - Setup - App signing - Upload key certificate' -ForegroundColor DarkGray
  } else {
    Warn 'Keystore opened, but no SHA256 line in the output to compare'
  }
} else {
  Warn 'keytool not found; skipping the fingerprint check'
}

if (-not $SkipBackup) {
  $backup = Join-Path $env:USERPROFILE 'Payweek-keystore-backup'
  New-Item -ItemType Directory -Force -Path $backup | Out-Null
  Copy-Item $jks, $propsPath $backup -Force
  Ok "backed up to $backup"
  Write-Host '        Still copy it somewhere off this machine.' -ForegroundColor DarkGray
}

# ── 2 · source and secrets ─────────────────────────────────────────────
Step 'Source'
Run 'git' @('fetch', 'origin', $Branch) ''
Run 'git' @('checkout', $Branch) ''
Run 'git' @('pull', 'origin', $Branch) ''
Ok "at $(git rev-parse --short HEAD)"

# Vite bakes these in at build time. Without the file the build SUCCEEDS and
# produces an app that throws on launch — no warning, no failed step, and you
# find out when a tester opens it.
$envFile = Join-Path $RepoPath '.env'
if (-not (Test-Path $envFile)) {
  Die '.env is missing' 'Without it the build succeeds and ships a blank app. See docs/UPLOAD_NOW.md Part 1.2.'
}
foreach ($k in 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY') {
  if (-not (Select-String -Path $envFile -Pattern "^$k=.+" -Quiet)) {
    Die ".env has no $k" 'See docs/UPLOAD_NOW.md Part 1.2.'
  }
}
Ok '.env has the keys the bundle needs'

# ── 3 · checks ─────────────────────────────────────────────────────────
Step 'Checks'
Run 'npm' @('ci') ''
Run 'npm' @('run', 'typecheck') 'Fix the type errors before shipping.'
Run 'npm' @('test') 'Fix the failing tests before shipping.'
Run 'npm' @('run', 'lint') ''
Ok 'typecheck, tests and lint all pass'

# ── 4 · build ──────────────────────────────────────────────────────────
Step 'Web bundle'
Run 'npm' @('run', 'build') ''
Run 'npx' @('cap', 'sync', 'android') ''

# `npm run vercel-build` swaps the landing page over index.html, and Capacitor
# loads index.html from the bundle — that mistake ships the marketing site as
# the app, and it looks like a successful build all the way to a signed
# bundle. This happened during an audit, which is why it is a script now
# rather than a warning in a document.
Run 'npm' @('run', 'verify:android') 'You ran vercel-build. Re-run: npm run build; npx cap sync android'
Ok 'Android assets contain the app, not the landing page'

Step 'Signed bundle'
Set-Location (Join-Path $RepoPath 'android')
Run '.\gradlew.bat' @('clean') ''
Run '.\gradlew.bat' @('bundleRelease') ''
Run '.\gradlew.bat' @('assembleRelease') ''

$aab = Join-Path $RepoPath 'android\app\build\outputs\bundle\release\app-release.aab'
$apk = Join-Path $RepoPath 'android\app\build\outputs\apk\release\app-release.apk'
$unsigned = Join-Path $RepoPath 'android\app\build\outputs\apk\release\app-release-unsigned.apk'
if (Test-Path $unsigned) {
  Die 'The APK came out unsigned' 'keystore.properties must sit in android\, beside gradlew.bat.'
}
foreach ($f in $aab, $apk) {
  if (-not (Test-Path $f)) { Die "Missing $f" 'The build reported success but produced nothing.' }
}
Ok "aab  $([Math]::Round((Get-Item $aab).Length / 1MB, 1)) MB"
Ok "apk  $([Math]::Round((Get-Item $apk).Length / 1MB, 1)) MB"

# ── 5 · what is in it ──────────────────────────────────────────────────
Step 'Version'
$gradle = Get-Content (Join-Path $RepoPath 'android\app\build.gradle') -Raw
$code = [regex]::Match($gradle, 'versionCode\s+(\d+)').Groups[1].Value
$name = [regex]::Match($gradle, 'versionName\s+"([^"]+)"').Groups[1].Value
Ok "versionName $name, versionCode $code"

Set-Location $RepoPath
Write-Host ''
Write-Host ('═' * 64) -ForegroundColor DarkGray
Write-Host ' Built and signed. Four things left, all in a browser:' -ForegroundColor White
Write-Host ''
Write-Host "  1. Install it first:  adb install -r `"$apk`"" 
Write-Host '     Check it gets past the sign-in screen. A blank app means .env.'
Write-Host ''
Write-Host '  2. Play Console - Closed testing - Create new release'
Write-Host "     Upload: $aab"
Write-Host "     Name:   $name ($code)"
Write-Host '     Notes:  docs/UPLOAD_NOW.md Part 4'
Write-Host ''
Write-Host '  3. Store listing - replace the 6 screenshots from assets\play\screenshots\'
Write-Host ''
Write-Host '  4. Review release - Start rollout to Closed testing'
Write-Host ''
Write-Host '     Never confirm a release with no bundle attached - it takes the' -ForegroundColor Yellow
Write-Host '     app away from the testers you already have.' -ForegroundColor Yellow
Write-Host ('═' * 64) -ForegroundColor DarkGray
Write-Host ''

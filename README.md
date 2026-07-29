# Payweek

Hours & earnings tracker for agency workers paid weekly. Know what's in your packet.

An Android app (Capacitor-wrapped web app) that logs shifts across multiple agencies, calculates expected gross pay with flexible rate rules, and diffs expected pay against actual payslips to catch underpayment. See `PROJECT_BRIEF.md` for the full spec.

## Stack

Vite · React 18 · TypeScript (strict) · Tailwind 4 · Capacitor 6 (Android) · Supabase (auth + Postgres + RLS) · TanStack Query · date-fns. All money is integer pence — no floats, ever.

**New here?** [docs/START_HERE.md](docs/START_HERE.md) walks through running
the app and publishing it, step by step.

## Setup

### 1. Supabase project

The live project is **payweek** (`jcwxxtimhrlzaojadmhx`, eu-west-2) with both
migrations in `supabase/migrations/` already applied and the security/performance
advisors clean. For a fresh project, apply the migrations in order via the SQL
editor or `supabase db push`.

Manual dashboard steps (not scriptable via migrations):

1. **Auth → URL Configuration**: set the Site URL to your dev URL (`http://localhost:5173`) and add `payweek://auth-callback` to Redirect URLs (needed for Android).
2. **Auth → Providers**: Email (magic link) is on by default. For Google, create OAuth credentials in Google Cloud Console and paste the client ID/secret into the Google provider settings.

After schema changes, regenerate `src/lib/database.types.ts` (`supabase gen types typescript`).

### 2. Environment

```sh
cp .env.example .env
```

For the live project:

```
VITE_SUPABASE_URL=https://jcwxxtimhrlzaojadmhx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_PXDZo1oea43av5x4lIj3lg_1vGP_8AI
```

(The publishable key is client-side by design; RLS is what protects the data.)

### 3. Run in the browser

```sh
npm install
npm run dev
```

### 4. Run on Android

```sh
npm run build
npx cap sync android
npx cap run android    # or open android/ in Android Studio
```

Magic links and Google OAuth on Android return to the app via the `payweek://auth-callback` deep link (registered in `AndroidManifest.xml`, handled in `src/auth/redirects.ts`). Open the magic-link email on the same device that requested it — the PKCE flow requires it.

## Release

See [docs/RELEASE.md](docs/RELEASE.md) for the signed-AAB build and Play
Console closed-testing runbook, [docs/DATA_SAFETY.md](docs/DATA_SAFETY.md) for
the Data safety form answers, and [docs/STORE_LISTING.md](docs/STORE_LISTING.md)
for listing copy, and [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) to
host the web app + privacy policy on Vercel. The privacy policy is served from
`public/privacy.html`.

## Checks

```sh
npm run typecheck   # tsc, strict
npm test            # vitest
npm run lint        # oxlint
```

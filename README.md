# Payweek

Hours & earnings tracker for agency workers paid weekly. Know what's in your packet.

An Android app (Capacitor-wrapped web app) that logs shifts across multiple agencies, calculates expected gross pay with flexible rate rules, and diffs expected pay against actual payslips to catch underpayment. See `PROJECT_BRIEF.md` for the full spec.

## Stack

Vite · React 18 · TypeScript (strict) · Tailwind 4 · Capacitor 6 (Android) · Supabase (auth + Postgres + RLS) · TanStack Query · date-fns. All money is integer pence — no floats, ever.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema: paste `supabase/migrations/20260728000001_init.sql` into the SQL editor (or `supabase db push` with the CLI).
3. **Auth → URL Configuration**: set the Site URL to your dev URL (`http://localhost:5173`) and add `payweek://auth-callback` to Redirect URLs (needed for Android).
4. **Auth → Providers**: Email (magic link) is on by default. For Google, create OAuth credentials in Google Cloud Console and paste the client ID/secret into the Google provider settings.

### 2. Environment

```sh
cp .env.example .env   # then fill in the project URL + anon key from Project Settings > API
```

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

## Checks

```sh
npm run typecheck   # tsc, strict
npm test            # vitest
npm run lint        # oxlint
```

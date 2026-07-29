# Deploy Payweek to Vercel

The repo is deploy-ready: `vercel.json` sets the SPA rewrite and asset caching,
and the build (`npm run build` → `dist/`) is verified. The privacy policy ships
at `/privacy.html` on whatever domain the site ends up on.

> **Why this wasn't done automatically.** The Vercel connector available in the
> build session could read the account (teams, projects) but was denied
> project creation (`403 forbidden: You don't have permission to create a
> project`) on every scope — a role/permission limit on the Vercel side. The
> two routes below are done from your own Vercel account, which has the rights.

## Route A — Connect the GitHub repo (recommended)

Gives you automatic deploys on every push and a proper place to hold the
Supabase keys.

1. Go to <https://vercel.com/new> and **Import** `patrykwrld/Payweek`.
2. Framework preset: **Vite** (auto-detected). Build command `npm run build`,
   output directory `dist` — both auto-filled. Leave them.
3. **Environment Variables** — add these two (from the Supabase project;
   Settings → API). The publishable key is safe in the client — RLS protects
   the data.
   ```
   VITE_SUPABASE_URL       = https://jcwxxtimhrlzaojadmhx.supabase.co
   VITE_SUPABASE_ANON_KEY  = sb_publishable_PXDZo1oea43av5x4lIj3lg_1vGP_8AI
   ```
4. **Deploy.** You get a `*.vercel.app` URL in ~1 minute.
5. When you buy **payweek.app** tomorrow: Project → **Settings → Domains** →
   add `payweek.app`, and point the domain's DNS at Vercel as it instructs.

## Route B — Vercel CLI (one-off, no GitHub link)

From the repo root, with `.env` filled in (see `.env.example`):

```sh
npm i -g vercel
vercel login
npm run build
vercel deploy --prebuilt --prod    # or: vercel --prod  (lets Vercel build)
```

## After it's live — two required follow-ups

1. **Supabase redirect URLs.** In the Supabase dashboard → **Authentication →
   URL Configuration**, set the **Site URL** to your Vercel URL and add it to
   **Redirect URLs**, e.g. `https://payweek.app` and
   `https://payweek.app/**`. Without this, magic-link and Google sign-in on the
   web will fail. (`payweek://auth-callback` stays there for the Android app.)
2. **Privacy policy URL for Google Play.** Once live, the address to give Play
   (App content → Privacy policy, and the Data safety deletion URL) is
   `https://payweek.app/privacy.html` — or the `*.vercel.app` equivalent until
   the domain is attached.

## Notes

- `vercel.json` rewrites every path that isn't a real file to `/index.html`, so
  client-side routes (`/shifts`, `/payday`, …) work on refresh, while
  `/privacy.html`, `/assets/*` and `/favicon.svg` are served directly.
- The Android app reads the privacy URL from `VITE_PRIVACY_URL` (see
  `.env.example`); point it at the live URL before building the release AAB.

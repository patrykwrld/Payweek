# Payweek — how this repo works

A UK agency-worker hours and pay tracker. React + Vite + TypeScript, wrapped
with Capacitor for Android, Supabase for data and auth, hosted on Vercel.

## Branches

| Branch | Role |
| --- | --- |
| `main` | **Production.** Vercel builds this; it is what payweek.app serves. |
| `claude/payweek-app-zk4tcb` | **Working branch.** All development happens here. Pushes get a Vercel preview URL. |

Work on the working branch, always. Promote deliberately:

```sh
git checkout main
git merge --ff-only claude/payweek-app-zk4tcb
git push origin main          # this is the deploy
git checkout claude/payweek-app-zk4tcb
```

`--ff-only` on purpose: if it refuses, main has something the working branch
does not, and that is worth looking at rather than merging over.

> Until a push to `main` happens, payweek.app keeps serving whatever was last
> deployed. That is the entire point of the split — pushing work is no longer
> the same action as publishing it.

Preview deployments are behind Vercel authentication (Deployment Protection
is set to `all_except_custom_domains`), so a preview URL opens for the account
owner and asks anyone else to sign in. Fine for checking your own work; not a
link to send a tester.

## Before pushing anything

```sh
npm run typecheck && npm test && npm run lint
```

All three must pass. For a change that touches the site, also:

```sh
npm run build && node scripts/postbuild-web.mjs && npm run check:csp
```

`check:csp` serves `dist` with the exact headers `vercel.json` declares and
loads every shipped page in a real browser. A blocked script is a blank
screen, not an error anybody sees, so this is not optional after touching
`vercel.json` or adding a third-party script.

## Things that look like successful builds and are not

- **A missing `.env`.** Vite bakes `VITE_SUPABASE_*` in at build time. Without
  the file the build *succeeds* and produces an app that throws on launch. No
  warning, no failed step.
- **`npm run vercel-build` before `cap sync`.** It swaps the landing page over
  `index.html`, and Capacitor loads `index.html` from the bundle — that ships
  the marketing site as the Android app, all the way to a signed bundle, with
  every check passing. Always `npm run build` for Android, and run
  `npm run verify:android` after `cap sync`; the release script does.

## Generated assets — never edit the output

| Command | Produces |
| --- | --- |
| `node scripts/make-site-shots.mjs` | `public/shots/` — the app screenshots on payweek.app |
| `node scripts/make-play-screenshots.mjs` | `assets/play/screenshots/` — the Play listing |
| `node scripts/make-posts.mjs` | `assets/posts/` — the social graphics |
| `node scripts/make-stories.mjs` | `assets/social/` — the Instagram stories |
| `node scripts/make-overlay.mjs` | `assets/qr/` — the printed scan overlays |
| `node scripts/make-email.mjs` | `public/email/hero.png` + the email preview |

The service worker's precache list in `dist/sw.js` is written by
`scripts/postbuild-web.mjs`, because Vite hashes every asset filename. The
placeholder it fills is `const PRECACHE = []` in `public/sw.js` — rename that
and the build fails loudly rather than shipping an app that cannot open
offline.

All of them need `npx vite --port 5199` running first, and all of them take
their app imagery from `src/shots.tsx` against the real components — so a
screen change shows up in the next run instead of quietly going stale. Every
one fails loudly on a wrong size or a blank render.

`scripts/release.ps1` takes a Windows checkout to a signed Android bundle;
`docs/UPLOAD_NOW.md` is the whole sitting including the keystore.

## Never

- Commit `.env`, `android/keystore.properties`, or any `.jks`. All gitignored.
  **This repository is public.**
- Email, paste or commit the upload keystore. Losing it means `app.payweek`
  can never be updated again; leaking it means somebody else can update it.
- Claim Payweek calculates tax, or that it is legal or financial advice. It
  estimates gross pay, and the site footer says so.

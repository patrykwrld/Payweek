# Getting Payweek published — from here

The app is built, tested and in Play Console. Everything below is Play Console
work plus one unavoidable wait.

**The wait is the whole game.** Google requires **12 testers opted in for 14
continuous days** before a personal developer account can publish to
production. Nothing shortens it. So the only thing that matters is reaching
**Step D** quickly — every day before that is a day added to the end.

Realistic timeline from today: **about 3 weeks.** Two to three hours of your
work, and the rest is waiting.

---

## The seven steps left

| | Step | Your time | Then |
| --- | --- | --- | --- |
| ~~**A**~~ | ~~Upload the bundle to Internal testing~~ | ✅ **done 4 Aug** | installed from Play |
| ~~**B**~~ | ~~App content — the compliance forms~~ | ✅ **done 5 Aug** | — |
| ~~**C**~~ | ~~Store listing — text and images~~ | ✅ **done 5 Aug** | — |
| **D** | **Closed testing — published 5 Aug.** Now recruiting | ⏳ **waiting on opt-ins** |  |
| **E** | Use it, collect feedback, fix things | during the wait | — |
| **F** | Apply for production access | 20 min | ⏳ a few days |
| **G** | Production rollout | 10 min | 🎉 live |

**Setup is complete — all 11 Play Console items are green.** From here nothing
is paperwork. Everything that remains is either one 20-minute job or waiting.

There is also **Step H — building an audience**, which runs *alongside* all of
this rather than after it. It is at the bottom, and it is the one part of this
document that is not on a deadline.

---

## ~~Before you start: the Google button~~ ✅ REMOVED

The sign-in screen used to offer **Continue with Google**. Every one of the 11
accounts on the project signed up with email and not one ever used Google,
which meant the provider was almost certainly never configured — and a
reviewer taps every button. It is gone, along with its handler and imports.

Sign-in is now username-or-email plus password, with registration and password
reset alongside. Nothing else changed.

> Adding Google back later is a small job: create an OAuth client in Google
> Cloud, paste the ID and secret into Supabase → Authentication → Sign In /
> Providers → Google, and restore the button. Worth doing **after** launch,
> when there is someone to benefit from it.

✅ The bundle was rebuilt after the removal and is the one now on Internal
testing, so there is nothing outstanding here.

---

## ~~Step A — Upload the bundle to Internal testing~~ ✅ DONE — 4 August

Release **1 (1.0.0)** is live on the Internal testing track and was installed
from Play onto a real phone. That closes the largest remaining unknown: the
bundle is accepted, correctly signed with the Step 7 upload key, and Google's
re-signing produces an app that installs and runs.

### The empty-looking Play page is not a fault

The Play listing currently shows `app.payweek`, a grey robot icon, *Unrated*,
and *No information available* under Data safety. Every one of those is a form
that hasn't been filled in yet, not a bug:

| What you see | The form behind it |
| --- | --- |
| `app.payweek` as the name | Store listing → App name (Step C) |
| Grey robot icon | Store listing → App icon. The icon in the APK is the *launcher* icon; Play uses the 512×512 you upload separately |
| No screenshots or description | Store listing (Step C) |
| **Unrated** | App content → Content ratings (Step B) |
| Data safety: *No information available* | App content → Data safety (Step B) |
| *"(unreviewed)"* · *"a test build that has not been verified"* | **Nothing.** Internal testing skips review by design. This wording stays for the whole internal track |

Expect the page to keep showing the old version for a few hours after you save
the listing. Play caches it.

### Still worth doing when you next have the phone

`Settings → Export` on the **Play-installed** build. Release mode runs ProGuard
and the Filesystem and Share plugins are the likeliest casualties — a silently
dead button is exactly what that failure looks like. Everything else in the app
has been exercised on this build.

---

## Step B — App content (45 minutes)

Play Console → **Policy → App content**. Every item needs a green tick before
anything can be reviewed.

📋 **Open [PLAY_ANSWERS.md](PLAY_ANSWERS.md) and work down it.** Every field on
both this step and Step C is written out there in the order Play asks, so you
never have to decide anything or open a second document. The table below is the
summary; that file is the thing to actually use.

| Item | Answer |
| --- | --- |
| Privacy policy | `https://payweek.app/privacy.html` |
| **Account deletion** | `https://payweek.app/delete-account.html` |
| Ads | **No** |
| App access | ⚠️ see below |
| Content rating | Fill in the questionnaire → expect PEGI 3 |
| Target audience | **18+** |
| News app | **No** |
| Data safety | Copy from [DATA_SAFETY.md](DATA_SAFETY.md) — all four types written out |
| Financial features | **No** |
| Health | **No** |
| Government apps | **No** |

### App access — do this bit properly

The reviewer cannot receive your emails, so they need an account that already
works. Make it **before** you fill the form in:

1. Register in the app: username `payweek_review`, an email **you** can open,
   a password you don't use anywhere else
2. **Open the confirmation email yourself** and finish the registration —
   the account must be confirmed before you hand it over
3. Add one agency and log two or three shifts, so the reviewer sees a working
   app rather than an empty screen
4. In **App access** → *All or some functionality is restricted* → add:

   > Username: payweek_review
   > Password: (the password)
   >
   > Enter these on the sign-in screen and tap **Sign in**. No email or
   > confirmation step is needed.

5. Sign out and sign back in with those exact details on a device that has
   never held that session. That is the only way to know a reviewer can

---

## Step C — Store listing (30 minutes)

Play Console → **Grow users → Store presence → Main store listing**.
Everything here is written or made already — field by field in
[PLAY_ANSWERS.md](PLAY_ANSWERS.md), including the Store settings page below the
listing itself.

| Field | Where it is |
| --- | --- |
| App name | `Payweek: Hours & Pay Tracker` |
| Short description | [STORE_LISTING.md](STORE_LISTING.md) — 73 characters |
| Full description | [STORE_LISTING.md](STORE_LISTING.md) |
| App icon | `assets/play/icon-512.png` |
| Feature graphic | `assets/play/feature-graphic.png` |
| Phone screenshots | `assets/play/screenshots/` — all six, in the numbered order |
| Category | **Productivity** |
| Email | `privacy@payweek.app` |
| Website | `https://payweek.app` |

---

## Step D — Closed testing ⏳ this starts the clock

### The three gates, in Play's own words

With setup complete, the **Production** panel on the dashboard now shows
exactly what is left. It is the whole remaining project on one screen:

| | Gate | State |
| --- | --- | --- |
| 1 | Publish a closed testing release | 20 minutes of your time |
| 2 | Have at least 12 testers opted in | **0 currently opted in** |
| 3 | Run the closed test with ≥12 testers for ≥14 days | not started |

**Apply for production** stays greyed out until all three are ticked.

> ⚠️ **The clock starts when the 12th tester opts in — not when you publish
> the track.** Gate 3 counts days on which at least 12 people were opted in.
> Publish today and recruit slowly and you have simply moved launch day later.
> This is why recruiting is now the highest-leverage thing in the project: it
> is the only remaining task whose speed you control.

> ⚠️ **An address on the tester list is not an opt-in.** Adding somebody to
> the email list only grants them permission to see the app. Gate 2 counts
> people who then *tapped the link, tapped Become a tester, and installed from
> Play*. A list of 14 addresses with nobody having tapped anything reads as
> **0 testers** in Play Console, and the 14 days do not begin. Chase the taps,
> not the addresses.

**Track published 5 August**, listing rendering correctly — icon, name,
description and release notes all live, installable from Play as
*Payweek: Hours & Pay Tracker (Early Access)*. The "Early Access" label is
what Play calls a closed track; it goes when Step G does.

Play Console → **Testing → Closed testing → Create track** (default "Alpha").

1. **Testers → Create email list** → add **14–15 Gmail addresses**. It must be
   the Google account each person uses on their phone
2. **Releases → Create new release** → *Add from library* → pick the bundle you
   already uploaded in Step A. No need to build again
3. **Review release → Start rollout**
4. Copy the opt-in link from the **Testers** tab and send it out

⚠️ **The requirement is 12 people opted in, continuously, for 14 days.** An
APK you send someone over Drive counts for nothing — Google only sees installs
that came through Play. Recruit 14–15 so one person uninstalling doesn't stop
the clock.

**Send them this:**

> I've made an app for tracking agency shifts and what you're owed. Can you
> try it for a couple of weeks?
>
> 1. Tap this link on your phone: *(opt-in link)*
> 2. Tap **Become a tester**
> 3. Then tap the Google Play link on that page to install it
>
> It needs the Google account you use on your phone. Please leave it installed
> for two weeks even if you don't use it much — that part matters most.

⏱️ First review of a new app takes a few days. The 14 days count from when
12 testers are opted in.

✅ **Testing → Closed testing** shows 12+ testers and a running day count.

---

## Step E — While the 14 days run

The only quiet window you'll get. None of it is urgent; all of it is worth it.

- **Use it yourself, for real.** Log your own shifts for two weeks. You will
  notice a wrong figure in a way no test ever will
- **Chase drop-outs the same day.** The count is continuous; if it falls below
  12 the clock stalls
- **Write down what testers say.** You need it for Step F, and it is the only
  honest source of what to fix
- **Fix and re-upload freely.** Bump `versionCode` in
  `android/app/build.gradle` (1 → 2 → 3…). It does **not** restart the 14 days
- **Watch Android vitals** for crashes. There is no crash-reporting SDK in the
  app by design, so Vitals is your only view

---

## Step F — Apply for production access (20 minutes)

Once the 14 days complete, Play Console prompts you to apply. You'll be asked,
in writing:

- how you recruited testers and what feedback you got
- what you changed as a result
- who the app is for and why it's ready

Answer it properly. A thin answer gets bounced and costs days. If you kept
notes in Step E this is twenty minutes.

⏱️ Google reviews the application. Expect days, not hours.

---

## Step G — Production rollout (10 minutes)

1. **Production → Create new release**
2. Add the bundle from your library (bump `versionCode` if you've rebuilt)
3. **Countries** — United Kingdom at minimum; the app is built around UK pay,
   12.07% holiday accrual and £ only
4. Release notes in plain English
5. Consider a **staged rollout at 20%** for the first release, so a serious bug
   reaches a fraction of people while you fix it
6. **Review release → Start rollout to production**

🎉 **Payweek is on Google Play.**

---

## Step H — Building an audience (runs alongside everything above)

Not on the critical path, no deadline, and the only part of this document that
compounds. Start it whenever; it pays off in months, not days.

### First, separate two jobs that look like one

| | Recruiting 12 testers | Building an audience |
| --- | --- | --- |
| **When** | Now — it gates the 14 days | Any time |
| **How many** | Exactly 14–15 people | As many as possible |
| **Where they come from** | **People you already know** | Strangers |
| **Does social media help?** | **No** | Yes, slowly |

A brand-new account with no followers recruits nobody. **The 12 testers will
come from your phone contacts, your workplace and your family** — that is
normal and it is what almost every developer does. Do not wait on social to
solve Step D.

### The gap that matters more than any account

**payweek.app has nowhere for a visitor to land.** The root URL serves the app
— someone arriving from Instagram hits a sign-in screen for a product they have
never heard of, with no explanation and no reason to trust it. Every visitor
you send there today is wasted.

Before any promotion is worth doing, the site needs a front page: what Payweek
is, the £696.91 story, the screenshots that already exist, and one thing to do
— **"Tell me when it's on Google Play"** with an email box. During closed
testing the app is not publicly installable, so an email list is the *only*
thing worth collecting. It also becomes the launch-day announcement list.

> This is a real piece of work — a landing page and somewhere to put the
> addresses. Ask me and I'll build it. It is the highest-value thing on this
> page that isn't a Play form.

### On Instagram and Twitter specifically

Both are fine. Neither is where your users are, and one of them is a poor fit.

| Platform | Verdict for Payweek |
| --- | --- |
| **Facebook groups** | **Where UK agency workers actually are.** Warehouse and agency job groups, regional job groups, and the Polish, Romanian and Bulgarian community groups that a large share of agency work runs through. Not a page — *groups*, joining as a person |
| **TikTok** | **The strongest growth channel available to you.** UK shift-work and payslip content performs, the audience skews exactly right, and it is the last platform where a standing start can still reach people |
| **Instagram** | Worth having. Discovery is weak without Reels, so in practice it is a credibility page people check after hearing about you elsewhere — which is a real job, just not a growth one |
| **Twitter / X** | **The weakest of the four for this audience.** UK employment and union Twitter exists but it is small, and agency workers are not scrolling it for tools. Claim the handle; don't spend time there |

**Claim all four handles now anyway**, plus TikTok, even the ones you won't
use. It costs ten minutes and it is unrecoverable if somebody takes
`payweek` while you are waiting on Google.

### What to actually post

The instinct is to post about shift tracking. Don't lead with it — it is a
chore, and nobody follows an account about a chore. **Lead with the
underpayment.**

- *"Your payslip is £30 short. Here's how to prove it."* — this is the hook.
  It is also the thing Payweek genuinely does better than a notes app
- **Holiday pay at 12.07%** — enormously misunderstood by agency workers, and
  a lot of people are owed money they don't know about
- **Night and weekend rates** — how a shift that crosses midnight should be
  priced, and how often it isn't
- Short clips of the breakdown screen showing exactly where a figure came from

That content is useful whether or not anyone installs anything, which is why it
travels. The product demo is a by-product.

⚠️ **Be careful being wrong about employment rights.** If you state what
someone is owed and it isn't right, that is a reputational problem and
potentially worse. Link to **gov.uk** and **ACAS** rather than asserting, and
say "check your contract" often. The safe framing is *here is how to check*,
never *here is what you are owed*.

### Two timing rules

1. **Do not point anyone at Google Play until Step G.** During closed testing
   the link shows *"item not found"* to everybody who isn't on your tester
   list. A dead link is worse than no link — you only get one first impression
   per person. Point at the website instead.
2. **Do not promise it's free forever.** The plan is free now, paid later. Say
   "free while we're building it" and nobody is misled when that changes.

### Honest expectations

A new account posting into a void does approximately nothing for two to three
months. That is not a sign it isn't working, and it is the reason to start now
rather than at launch — so that when Payweek does go live there is somewhere
for the announcement to land.

**If you only do one thing here:** the landing page with an email box. Ten
addresses collected before launch are worth more than a thousand followers.

---

## If something goes wrong

| What you see | What it means |
| --- | --- |
| Upload rejected, wrong package | The bundle must be `app.payweek` — it is |
| "You need to complete App content" | Step B has an unticked item |
| Tester can't find the app | They opened the opt-in link but didn't tap *Become a tester* |
| Day count not moving | Fewer than 12 opted in. Check the Testers tab |
| Rejected for "unable to access" | The reviewer login didn't work — Step B, and test it yourself first |
| **A pay figure looks wrong** | **Stop and send me the breakdown screenshot** |

---

## What's already done — don't redo any of it

| | |
| --- | --- |
| Pay maths | Verified against a real payslip to the penny — £696.91 |
| Android build | Compiles, signed, bundle and APK both produced |
| Signing key | Created, verified, backed up |
| Account deletion | Works on a real phone, plus the web page Play requires |
| Export | Works on a real phone |
| Registration | Verified end to end against the live project |
| Website | payweek.app live, privacy policy and deletion page published |
| Store assets | Six screenshots, icon, feature graphic, all listing copy |
| Play paperwork | Data safety answers and reviewer instructions written |
| Internal testing | Release 1 (1.0.0) live, installed from Play on a real phone |
| **Play Console setup** | **All 11 items green — App content and store listing both complete, 5 Aug** |

### ⚠️ The two-day deploy outage — fixed 4 August, worth remembering

Between 2 and 4 August **every push to payweek.app silently failed to deploy.**
The site kept serving an old build, which is why *Continue with Google* was
still on the live sign-in screen days after the button was deleted from the
code.

The cause was a `_comment` key in `vercel.json`. JSON has no comment syntax and
Vercel rejects unknown top-level properties outright:

```
The `vercel.json` schema validation failed:
should NOT have additional property `_comment`
```

The failure mode is what makes it dangerous: rejection happens **before the
build starts**, so the build log is empty, the previous deployment stays live,
and the whole thing looks like a site that simply didn't update. Nine
deployments failed in a row without anything looking broken.

**The lesson generalises: "the site didn't change" is not evidence the code is
wrong.** Check the deploy state first. `docs/DEPLOY_VERCEL.md` now carries the
rule about not putting comments in `vercel.json`.

---

## ~~Step 1 — The privacy contact address~~ ✅ DONE

`privacy@payweek.app` is live on Google Workspace. Verified from Vercel's
authoritative nameserver:

```
MX   1 smtp.google.com
TXT  google-site-verification=sChVyn_ri5HRdQzQUwlsZ4UJJEjYj3T5yFjMZHSE32c
TXT  v=spf1 include:_spf.google.com ~all
A    64.29.17.65, 216.198.79.1   (unchanged — the site was never affected)
```

Nothing in the repo needed changing: the policy, the app and the Play
paperwork have said `privacy@payweek.app` from the start.

> One loose end: send a real email to it and open it. DNS proves mail reaches
> Google; it cannot prove the `privacy@` user exists inside the tenant.

> When adding DNS records at Vercel for `payweek.app` itself, leave the
> **Name** field empty rather than typing `@`. Vercel saves `@` correctly but
> then rejects it as "wrong characters" if you reopen the field to edit.

---

## ~~Step 2 — Check the maths against a real payslip~~ ✅ DONE — it matches

Checked 3 August 2026 against a real week, on a phone. Six shifts in the week
ending Sunday 2 August:

| | | |
| --- | --- | --- |
| Tue 28 Jul | 17:00–02:00 · 8h | £115.57 |
| Thu 30 Jul | 17:00–04:00 · 10h | £146.60 |
| Fri 31 Jul | 17:00–02:00 · 8h | £115.66 |
| Sat 1 Aug | 17:00–00:45 · 7h 15m | £103.51 |
| Sun 2 Aug | 17:00–02:00 · 8h | £115.57 |
| Sun 2 Aug | 17:00–01:00 · 7h | £100.00 |
| | **Total** | **£696.91** |

**£696.91 on the payslip, £696.91 from the hours.** Night bands, a Friday
running into Saturday, a shift ending at 00:45 and two shifts on the same
Sunday — all priced correctly, to the penny.

This was the one step where a bad answer would have changed the shape of the
project. It didn't.

> The £0.30 discrepancy on screen was a mistyped `696.61` in the box, not a
> difference in the maths. That typo did expose a real bug, now fixed: the
> money fields accepted any number of digits, and a third decimal place made
> the whole verdict silently disappear.

---

## ~~Step 3 — Confirm the Supabase redirect URLs~~ ✅ DONE

**Authentication → URL Configuration** carries `payweek://auth-callback`,
confirmed 2 August 2026. That is the entry that returns you to the Android app
after a magic link, and there is no API to read it — it needed a human looking
at the dashboard.

---

## ~~Step 3b — Email sending~~ ✅ DONE — custom SMTP is on

Auth emails now go out through Google Workspace as `privacy@payweek.app`,
name `Payweek`, via `smtp.gmail.com:465` with an App Password. Google allows
2,000 messages a day, so 12 testers signing in is not close to a limit.

Supabase warns that Gmail is a personal rather than transactional mailer.
That is about deliverability at volume and is fine for a closed test; if
Payweek gets real traction, move to Resend (Host `smtp.resend.com`, Port
`465`, Username literally `resend`, Password the `re_…` API key) and send as
`noreply@payweek.app`.

The **Minimum interval per user** was left at 60 seconds deliberately — it is
the same number the sign-in screen counts down against, so the two agree
rather than the app promising something the server then refuses.

<details>
<summary>The original setup instructions, kept in case it ever needs redoing</summary>

Supabase → **Authentication → Emails → SMTP Settings** → **Enable custom
SMTP**:

| Field | Value |
| --- | --- |
| Sender email address | `privacy@payweek.app` |
| Sender name | `Payweek` |
| Host | `smtp.gmail.com` |
| Port number | `465` |
| Minimum interval per user | `60` |
| Username | `privacy@payweek.app` |
| Password | a Google **App Password**, not the account password |

> ⚠️ **Username must be an address you can sign into Gmail with** — a real
> user, not an alias. Google rewrites the From header to whoever
> authenticated, so if Username and Sender disagree, Sender is ignored.

The App Password: sign into Google as that address →
<https://myaccount.google.com/security> → turn on **2-Step Verification** (App
Passwords don't exist without it) → <https://myaccount.google.com/apppasswords>
→ create one → **strip the spaces** when pasting.

Then Supabase → **Authentication → Rate Limits** → hourly email limit to
**100**. Enabling custom SMTP only raises it to 30 on its own.

</details>

---

## ~~Step 3d — Auth settings in Supabase~~ ✅ DONE

How signing in works now, in one paragraph, because these settings only make
sense against it:

> **Registering** asks for a username, an email and a password, and sends one
> email. Opening that email drops the person straight into Payweek, already
> signed in, with banknotes falling past a "You're in". **After that there are
> no more emails.** They sign in with their username and password. The email
> address exists so a forgotten password can be reset — nothing else.

Set on 3 August: **Confirm email on**, **minimum password length 8**, hourly
email **rate limit 100**.

> ⏳ **Not yet proven.** The only way to know *Confirm email* really took is a
> fresh registration: the new row in `auth.users` should arrive with
> `email_confirmed_at` empty and fill in when the link is opened. Every
> account that exists today predates the change, so it proves nothing.
> **Step 3c registers a new account — that is the check.**

Supabase → **Authentication → Sign In / Providers → Email**:

| Setting | Set it to | Why it has to be this |
| --- | --- | --- |
| **Confirm email** | ✅ **On** | This is the setting that *makes* the flow. The confirmation email **is** the link that finishes registration and carries the person into the app. With it off, no email is ever sent and the whole welcome never happens |
| **Minimum password length** | **8** | The app refuses anything shorter. A lower number is a promise the app doesn't keep; a higher one refuses passwords the app just accepted |
| ~~Leaked password protection~~ | **Leave it off** | Supabase gates this behind the **Pro plan at $25/month**, and it is **not** a Play requirement. Payweek now does the same check itself, for nothing — see below. The advisor warning about it can be ignored |

> ⚠️ **This reverses what an earlier version of this document said.** It told
> you to turn *Confirm email* off, which was right when the email link was a
> way to *sign in* and being asked to confirm was pure friction. Now the link
> is the last step of *registering* — turning it off removes the email
> entirely and there is nothing to open.

✅ **Check:** register a throwaway account at payweek.app. You should get an
email from `privacy@payweek.app`; opening it should land you inside the app
with the notes falling.

### The leaked-password check, without the $25

Supabase only offers it on Pro. Rather than pay for one toggle, Payweek does
it directly against the same source, in `src/lib/pwnedPassword.ts`:

- When a password is chosen — registering, resetting, or changing it in
  Settings — the app takes a SHA-1 hash **on the device** and sends only the
  **first five characters** to Have I Been Pwned's range API.
- The reply is several hundred breached hashes sharing that prefix. The
  comparison happens locally. The service never learns the password, the full
  hash, or who was asking. This is HIBP's documented k-anonymity model.
- A hit is refused with the count: *"That password has appeared in known data
  breaches 24,231,000+ times."*
- It **fails open** on a timeout, an outage or an old WebView. A third party
  having a bad day must never be why somebody can't register.

Twelve tests cover it, including one asserting that what goes over the wire is
exactly five characters and nothing else. The privacy policy describes it.

> Three warnings under **Advisors → Security** are expected and should be left
> alone. One is *Leaked Password Protection Disabled*, which is the Pro
> feature above, now handled in the app instead. They say `public.username_available` is a `SECURITY DEFINER` function
> anyone can call. It is, on purpose — a registration form has to answer "is
> this username taken?" before there is any session to ask with. It returns a
> boolean and nothing else, so the most it discloses is whether a handle is in
> use, which is inherent to having usernames at all. Turning a username into
> an email address needs the service role and happens only inside the
> `username-signin` Edge Function.

---

## Step 3c — Rebuild the app on your phone (15 minutes)

### What this is, and why it exists

Payweek is a web app in an Android wrapper. The APK does **not** fetch the
site — it carries a frozen copy of it inside, in `android/app/src/main/assets`.
So the app on your phone is not "Payweek"; it is *Payweek as it stood on the
afternoon of 2 August*. Pushing to GitHub updates payweek.app within a minute
and does nothing at all to the phone.

Three commands, in this order, are what move new code into the APK:

| | |
| --- | --- |
| `npm run build` | Compiles the web app into `dist/` |
| `npx cap sync android` | Copies `dist/` into the Android project's assets |
| `gradlew assembleDebug` | Packages those assets into an installable APK |

Miss the first two and Gradle rebuilds happily — around the **old** web app.
That is the trap: `BUILD SUCCESSFUL` tells you nothing about whether your
changes are in it.

### What you'd be missing

Everything since 2 August has touched the **sign-in path**, which is the one
thing that must not be broken in the file you send to Google:

- **A new way in altogether.** Registering asks for a username, an email and
  a password and sends one email; opening it lands you inside the app with
  banknotes falling past a "You're in". After that it is username and password
  — **the sign-in screen no longer offers an email link at all**
- **Forgotten your password**, with a reset link and a screen to set a new one
- **Settings → Signing in**, so your existing magic-link account can claim a
  username and a password
- a real **Sign out** button in Settings — your tester couldn't find the old one
- **3 sign-in links per address every 10 minutes**, with a live countdown
- **Keep me signed in**, which changes where the session token is stored
- opening with no signal and nothing cached no longer pulses grey blocks forever
- money fields now refuse a third decimal place instead of silently dropping
  the answer

### Do it

```powershell
cd C:\dev\Payweek
git pull origin claude/payweek-app-zk4tcb
npm install
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Install `android\app\build\outputs\apk\debug\app-debug.apk` the same way you
did last time — Android will offer to update the existing app, and your data
stays. Then check three things:

1. **Register** with a username, an email you can open **on the phone**, and
   a password. You should land on *One step left*.
2. **Open the email on the phone.** It should come from `privacy@payweek.app`
   — which confirms Step 3b at the same time — and tapping the link should
   drop you into Payweek with the notes falling. This is the moment to check;
   it is the first thing every new user will see.
3. **Settings → Sign out**, then sign back in with the username and password.
   No email. This is the path every tester and the Play reviewer will take.
4. **Settings → Signing in** on your own older account — claim a username and
   set a password, then sign out and back in with them.
5. **Keep me signed in** ticked, close Payweek completely, reopen — still in.

✅ Quickest proof the rebuild took: the sign-in screen asks for **Username or
email** *and* a password, and there is **no** "Email me a sign-in link"
button. If either is wrong, the old assets are still in the package.

❌ **Stop if sign-in fails.** Send me what the screen says. Never build a
release from a build you haven't signed into yourself.

---

## ~~Step 4 — Install Android Studio~~ ✅ DONE

Installed on Windows 11 with SDK Platform 35, Build-Tools 35 and JDK 21
pinned. Step 5 proved it works.

---

## ~~Step 5 — Build the Android app~~ ✅ DONE — it compiles

Verified 2 August 2026 on Windows 11: **`BUILD SUCCESSFUL`**, a 4.8 MB debug
APK, 193 tasks. Gradle 8.9 · AGP 8.7.2 · compileSdk 35 · JDK 21 · Capacitor 6.

**No Capacitor 7 migration was needed** — the fallback in the old plan can be
ignored. The toolchain raised to meet Play's API 35 floor is now proven rather
than assumed, which was the single largest unknown left in this project.

Three things cost time, all machine setup rather than the app. They are
written up with fixes in [BUILD_ANDROID.md](BUILD_ANDROID.md):

1. **Java version.** Gradle 8.9 + AGP 8.7.2 need Java **17–21**. A Java 8 on
   PATH fails one way, a Java 25 fails another. Pin JDK 21 via
   `org.gradle.java.home` in `%USERPROFILE%\.gradle\gradle.properties`.
2. **`SDK location not found`** — write `sdk.dir` into `android/local.properties`.
3. **Wrong platform.** Android Studio's wizard installs the newest SDK
   (`android-37.0`), not 35. Add API 35 and Build-Tools 35 in the SDK Manager.

To rebuild after any code change:

```powershell
cd C:\dev\Payweek
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

---

## Step 6 — The two buttons that have never run for real (25 minutes)

### ~~Delete my account~~ ✅ WORKS — verified 3 August on a phone

It signed the account out and removed it. Play actively tests this path, so
this was a real blocker rather than a nice-to-have.

It failed twice first, and the reason is worth keeping because it will look
like a network fault if it ever comes back:

> supabase-js sends an `X-Client-Info` header on every request. The function's
> `Access-Control-Allow-Headers` didn't list it, so the browser's preflight
> **passed on the server and failed on the client** — the function logged a
> clean `OPTIONS | 200` and the POST was never sent. The app faithfully
> reported a network failure for a server that had answered perfectly.
>
> Fixed in v3 by echoing `Access-Control-Request-Headers` back rather than
> listing them, so it cannot recur when supabase-js next adds a header.

Deleting the account also removed the shifts behind the Step 2 payslip check.
That's fine — the figures are written into Step 2 above — but signing back in
gives an empty account, so the agency and rates need adding again.

### ~~Export~~ ✅ WORKS — verified 3 August on a phone

The Android share sheet opens with a CSV of every shift and what it paid.

Step 6 is closed. Both of the things that had only ever run against a local
stand-in now work on real hardware.

---

## Step 7 — Create your signing key ✅ KEY CREATED — 3 August 2026

Verified with `keytool -list -v`. Every field Play cares about passes:

| Play requires | Yours |
| --- | --- |
| A private key, not just a certificate | `PrivateKeyEntry` ✅ |
| RSA 2048-bit or better | **4096-bit RSA** ✅ |
| Valid beyond 22 October 2033 | **19 December 2053** ✅ |
| Alias matching `keyAlias` | `payweek-upload` ✅ |

> ⚠️ **The key was regenerated on 3 August** after the first password was
> exposed, so the original fingerprints recorded here were deleted rather than
> left to mislead. **Record the new ones** from your own machine:
>
> ```powershell
> $jdk = (Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory | Where-Object Name -like "jdk-21*" | Select-Object -First 1).FullName
> & "$jdk\bin\keytool.exe" -list -v -keystore "C:\dev\Payweek\android\payweek-upload.jks" -alias payweek-upload
> ```
>
> Fingerprints are public and safe to write down — the password is not. Paste
> them below when you have them. After the first upload, compare them against
> the **Upload certificate** in Play Console → *Setup → App integrity* to
> confirm the right key was used.

**Still to do:** the `git status` check, and the backup. Both below.

<details>
<summary>The full instructions, kept in case the key ever needs remaking</summary>


### What this is, in plain terms

Android will not install an app unless it is **signed** — cryptographically
stamped, so a phone can tell that an update to Payweek really came from you
and not from somebody who repackaged it. A signing key is that stamp.

There are two keys involved, and mixing them up is where the fear comes from:

| | Who holds it | What it does |
| --- | --- | --- |
| **App signing key** | **Google** | The one phones actually check. Google generates and keeps it under Play App Signing, which is mandatory for new apps. You never touch it |
| **Upload key** | **You** | Proves to *Google* that an upload is from you. Google checks it, strips it, and re-signs with the app signing key |

**You are making the upload key.** That is the whole of Step 7.

> 🔐 **What losing it really costs.** Because Google holds the app signing key,
> a lost upload key is recoverable: you ask Google to register a replacement.
> A support thread and a few days, not a dead listing. And before your first
> upload it costs nothing at all — delete the file and run the command again.
> Back it up anyway; the point is to never spend those days.

You do this **once, ever**. Every future update to Payweek, for as long as it
exists, is signed with this same key.

---

### Before you start

Have ready:

- **A password you will not lose.** Not one you'll "remember" — write it into
  a password manager *before* you type it. It cannot be recovered or reset.
- 10 minutes.

You do **not** need the phone, and you do **not** need Steps 3c or 6 done
first. Step 7 is entirely offline and independent.

---

### 1. Open PowerShell in the project

**PowerShell**, not Command Prompt — the commands below use PowerShell syntax
and will fail in `cmd`.

```powershell
cd C:\dev\Payweek
```

### 2. Find the JDK

`keytool` is the tool that makes keys. It ships inside the JDK 21 you
installed in Step 5, and this finds it rather than trusting `PATH` — which is
what caused the Java-version trouble the first time round.

```powershell
$jdk = (Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory | Where-Object Name -like "jdk-21*" | Select-Object -First 1).FullName
echo $jdk
```

✅ Prints something like `C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot`.

❌ **Prints nothing / blank.** Your JDK is somewhere else. Find it with:

```powershell
where.exe keytool
```

and set `$jdk` to the folder *above* `\bin`, e.g.
`$jdk = "C:\Program Files\Java\jdk-21"`.

> `$jdk` only exists in the window you set it in. If you close PowerShell and
> come back, run step 2 again before step 3.

### 3. Create the key

One command. It is long; copy the whole block.

```powershell
& "$jdk\bin\keytool.exe" -genkeypair -v `
  -keystore "C:\dev\Payweek\android\payweek-upload.jks" `
  -alias payweek-upload `
  -keyalg RSA -keysize 4096 -validity 10000 `
  -dname "CN=Payweek, O=Payweek, C=GB"
```

What the parts mean, so none of it is magic:

| Part | Meaning |
| --- | --- |
| `-keystore …payweek-upload.jks` | The file to create. It must land in `android\`, because that is where Gradle looks |
| `-alias payweek-upload` | The key's name inside the file. Must match `keyAlias` in step 4 |
| `-keyalg RSA -keysize 4096` | The algorithm. Play requires RSA 2048 or better; 4096 is comfortably above |
| `-validity 10000` | Days — about 27 years. Play requires a key valid past 2033 |
| `-dname "CN=Payweek, …"` | The name on the certificate. Nobody sees it. Supplying it here skips six interactive questions |

**It will now ask you three things:**

| Prompt | What to do |
| --- | --- |
| `Enter keystore password:` | Type your password. **Nothing appears on screen — not even dots.** That is normal, not a frozen terminal |
| `Re-enter new password:` | The same password |
| `Enter key password for <payweek-upload>` `(RETURN if same as keystore password):` | **Press Enter.** Step 4 assumes you did |

✅ Finishes with a line like:

```
[Storing C:\dev\Payweek\android\payweek-upload.jks]
```

❌ `keytool : The term 'keytool' is not recognized` → you missed the `& "$jdk\bin\..."` part, or `$jdk` is empty. Redo step 2.
❌ `Keystore file exists` → you already made one. If it was a mistake and you have **not uploaded to Play yet**, delete it and rerun:
`Remove-Item C:\dev\Payweek\android\payweek-upload.jks`

> 🔒 **Never paste this password anywhere.** Not into a chat, not into an
> email, not into a support thread — including to me. The moment it is written
> down somewhere you don't control, the key is compromised and has to be
> remade. Before a first upload that costs five minutes; afterwards it costs a
> support ticket and days of waiting.
>
> If it does leak, the fix is at the bottom of this step: **Remaking the key**.

### 4. Write the file Gradle reads

Gradle can't ask you for a password mid-build, so it reads one from
`android\keystore.properties`.

```powershell
$pw = Read-Host "Type the same password again"
Set-Content -Path "C:\dev\Payweek\android\keystore.properties" -Encoding ascii -Value @(
  "storeFile=payweek-upload.jks",
  "storePassword=$pw",
  "keyAlias=payweek-upload",
  "keyPassword=$pw"
)
```

Your typing **is** visible here, on purpose — a silent typo turns into a
confusing build failure twenty minutes later. PowerShell does not record
`Read-Host` input in its history.

> `storeFile` is deliberately a bare filename, not a full path. Gradle
> resolves it relative to `android\`, which is also what makes the same
> config work if you ever move the project.

### 5. Check it actually works

Three checks, each catching a different mistake.

**a. The file says what you think:**

```powershell
Get-Content C:\dev\Payweek\android\keystore.properties
```

✅ Four lines, with your password on two of them.

**b. The password actually opens the key** — this is the real test:

```powershell
& "$jdk\bin\keytool.exe" -list -v -keystore "C:\dev\Payweek\android\payweek-upload.jks" -alias payweek-upload
```

Type the password when asked.

✅ Prints `Alias name: payweek-upload`, `Entry type: PrivateKeyEntry`, a
validity range ending around 2053, and a **SHA-256 fingerprint**.
❌ `Keystore was tampered with, or password was incorrect` → the password in
`keystore.properties` doesn't match the key. Redo step 4, typing carefully.

**c. Neither file can ever reach GitHub:**

```powershell
cd C:\dev\Payweek
git status --short
```

✅ **Neither `payweek-upload.jks` nor `keystore.properties` is listed.**
`.gitignore` covers both and that has been verified — but check, because
publishing a signing key is the one mistake in this whole project that cannot
be undone.

### 6. Back it up — properly, now

Copy **both** somewhere you will still have in three years:

- `C:\dev\Payweek\android\payweek-upload.jks`
- The password

A password manager entry with the file attached is ideal. Emailing the file to
yourself works. A note on the desktop of this laptop does not.

Losing the *password* is the more common failure than losing the file, and the
two are useless apart.

### 7. Nothing else to do

You do not need to tell Gradle about any of this. `android/app/build.gradle`
already looks for `keystore.properties`, and builds a signed release when it
finds one. **Step 8 will just work.**

✅ **Step 7 is complete when:** `payweek-upload.jks` exists, `keytool -list`
opens it with your password, `git status` is clean, and the backup is done.

### Remaking the key, if the password leaks

**Before your first upload to Play this is free** — the key has no history and
nothing depends on it. Do it without hesitating.

```powershell
cd C:\dev\Payweek
Remove-Item android\payweek-upload.jks
Remove-Item android\keystore.properties
```

Then repeat parts 2–6 with a password you have **not** typed anywhere except
the prompt and your password manager. Delete any backup of the old `.jks` as
well — a keystore file plus a known password is the whole key.

Everything built with the old key becomes worthless, so rebuild Step 8
afterwards. The fingerprints recorded above will change; replace them.

**After a first upload it is not free.** Google would have to register a
replacement upload key: a support request and several days. Which is the
entire reason for the warning in part 3.

</details>

## Step 8 — Build the file you upload (20 minutes)

### What you are making, and why there are two files

Play does not take an APK any more. It takes an **Android App Bundle**
(`.aab`) — a package Google opens up and re-cuts into a smaller APK for each
individual phone. You cannot install an `.aab` yourself, which is exactly the
problem: the thing you send Google is the one thing you cannot test.

So this step builds **two** files from identical settings:

| File | Purpose |
| --- | --- |
| `app-release.aab` | What you upload to Play |
| `app-release.apk` | The same build as an installable file, so you can prove it works |

Both are signed with your upload key and both run ProGuard. If the APK works,
the bundle works.

> ⚠️ **This is where a release can break when every debug build was fine.**
> Release turns on `minifyEnabled` and `shrinkResources` — ProGuard renames
> and deletes code it believes is unused. Capacitor ships rules that protect
> its plugins, so this is expected to pass, but the failure mode is a button
> that silently does nothing. That is why the APK exists.

---

### 1. Build both

```powershell
cd C:\dev\Payweek
git pull origin claude/payweek-app-zk4tcb
npm install
npm run build
npx cap sync android
cd android
.\gradlew.bat clean
.\gradlew.bat bundleRelease
.\gradlew.bat assembleRelease
```

`clean` is worth the extra two minutes here, once — it removes any stale
artefact from the debug builds so what you upload is built from nothing but
today's source.

✅ **`BUILD SUCCESSFUL`** twice, and two files exist:

```
android\app\build\outputs\bundle\release\app-release.aab
android\app\build\outputs\apk\release\app-release.apk
```

❌ `Keystore was tampered with, or password was incorrect`
→ the password in `android\keystore.properties` doesn't match the key. Rewrite
that file (Step 7, part 4), then rerun.

❌ A file called `app-release-unsigned.apk`, or no `keystore.properties` found
→ the file is in the wrong folder. It goes in `C:\dev\Payweek\android\`, beside
`gradlew.bat` — **not** in the project root and **not** in `android\app\`.

### 2. Prove it was signed with *your* key

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$apksigner = (Get-ChildItem "$sdk\build-tools" -Recurse -Filter apksigner.bat | Sort-Object FullName -Descending | Select-Object -First 1).FullName
& $apksigner verify --print-certs "C:\dev\Payweek\android\app\build\outputs\apk\release\app-release.apk"
```

> The version folder under `build-tools` is whatever the SDK Manager
> installed — 35.0.0, 36.0.0, something else — so this finds it instead of
> naming one. Hardcoding a version is how this command breaks on a machine
> that installed a different one.

✅ Prints a **SHA-256 digest** that matches the key from Step 7:

```
bec563ee3786ec385a24d86dde14fb06364fcc750786d775868f6fe04372c15f
```

`apksigner` prints it lowercase with no colons; Step 7's `keytool` printed the
same bytes uppercase with colons. Same key.

> **The wall of `WARNING: META-INF/… not protected by signature` is normal.**
> Expect around forty of them. They are the version-marker files the Android
> Gradle Plugin writes into `META-INF/`, and v1 JAR signing does not cover
> that folder. Every Android app built this way prints them. What matters is
> what is *absent*: if verification had failed, apksigner would say
> `DOES NOT VERIFY` and stop.

❌ `DOES NOT VERIFY` → the build did not sign. Go back to step 1's error notes.
❌ Nothing found → `apksigner` isn't installed. `keytool` can read the same
certificate out of the APK, and you already have it:
>
> ```powershell
> & "$jdk\bin\keytool.exe" -printcert -jarfile "C:\dev\Payweek\android\app\build\outputs\apk\release\app-release.apk"
> ```
>
> That prints the fingerprints in `keytool`'s format — uppercase with colons —
> so they compare directly against Step 7's output.

### 3. Install the release APK and use it ⚠️ do not skip

The debug build already on your phone is signed with a **different key**, so
Android will refuse to install over it.

1. **Open Payweek with signal first** so everything syncs — uninstalling takes
   the local copy with it
2. Uninstall Payweek from the phone
3. Put `app-release.apk` on the phone the same way as before (Drive is easiest)
4. Install it

Then do all five of these. Each one exercises code ProGuard could have broken:

| Check | What it proves |
| --- | --- |
| **Register** a new account | Sign-up, the username check, the email |
| **Open the email, land in the app** | The deep link and the welcome |
| **Sign out, sign back in** with username and password | The `username-signin` function |
| **Log a shift** | The rate engine and the database |
| **Settings → Export** | The Filesystem and Share plugins, the likeliest ProGuard casualties |

✅ All five work → the bundle is good and Step 8 is done.
❌ Anything silently does nothing → that is ProGuard. Send me which one and I
will add a keep rule.

### 4. About `versionCode`

`android/app/build.gradle` has `versionCode 1`. That is correct for a first
upload. **Every later upload to Play must have a higher number** — 2, then 3,
and so on — or Play rejects the file. Nothing to change today.

## Step 9 — Screenshots and the listing (45 minutes)

### The screenshots are already made ✅

Six of them, in `assets/play/screenshots/`, at exactly **1080×1920** — the
size Play wants, so nothing is resampled and no aspect ratio is rejected.
Upload them in the numbered order; [assets/play/README.md](../assets/play/README.md)
says what each one is and why it sits where it does.

They are real screens from the real app, captioned — not mock-ups. The data is
a fictional agency on plausible UK rates, and the week shown deliberately
includes two shifts running past midnight and a Sunday night that hits both
the weekend and night rules, because that is the case the app exists for.

Also ready in `assets/play/`: `icon-512.png` (512×512) and
`feature-graphic.png` (1024×500).

> If you'd rather use your own, take them on the phone with your real data —
> just check each is 9:16 and at least 320px on the short side. The set in the
> repo is enough to publish with, so this is optional.

Play Console → **Create app**: *Payweek: Hours & Pay Tracker*, English (UK),
App, Free. Work through **App content** — every item needs a green tick:

| Item | Answer |
| --- | --- |
| Privacy policy | `https://payweek.app/privacy.html` |
| **Account deletion URL** | `https://payweek.app/delete-account.html` — ⚠️ **required**, see below |
| Ads | No |
| App access | ⚠️ **see below — likeliest cause of rejection** |
| Content rating | Fill in the questionnaire → expect Everyone / PEGI 3 |
| Target audience | 18+ |
| Data safety | Copy from [DATA_SAFETY.md](DATA_SAFETY.md) — every answer is written out |
| Financial features | **No** |
| Government apps | No |

### ⚠️ The account deletion URL is a rejection trap

Any app that lets people create an account has to give Play a **web page**,
reachable by somebody who has already uninstalled the app, that explains how
to delete the account. The in-app button is necessary and **not sufficient** —
this is a separate field on the Data safety form and apps get rejected for
leaving it out.

`https://payweek.app/delete-account.html` is that page. It is written, live,
and deliberately plain HTML that needs nothing from the app bundle, so it
still works for someone who has uninstalled.

### App access — a reviewer needs a way in

Payweek shows nothing without a login, so Play requires you to hand the
reviewer working credentials. Since Step 3d this is straightforward: **make
them an account with a username and a password.**

> An earlier version of this document said to give Play an email address and
> tell the reviewer to open the emailed link. That would have been rejected —
> the reviewer cannot open your inbox. Usernames exist partly to remove that
> problem, and a Google account with 2FA turned off is no longer needed either.

1. On the phone or at payweek.app, **Create an account**: username
   `payweek_review`, any email **you** can open, a password you don't use
   anywhere else
2. **Open the confirmation email yourself and finish the registration.** This
   matters: the reviewer will never see an email, so the account has to be
   fully confirmed before you hand it over. Once it is, signing in needs
   nothing but the username and password
3. Add one agency and log two or three shifts, so the reviewer sees a working
   app rather than an empty state and can find the deletion path
4. In **App access** → *All or some functionality is restricted* → add:

   > Username: payweek_review
   > Password: (the password)
   >
   > Enter these on the sign-in screen and tap **Sign in**. No email or
   > confirmation step is needed.

5. Sign out and sign back in with those exact details, on a device that has
   never held that session, before you submit. That is the only way to know a
   reviewer can

Listing copy — title, short description, full description — is written for you
in [STORE_LISTING.md](STORE_LISTING.md).

---

## Step 10 — Closed testing (15 minutes, then a 14-day wait)

Personal developer accounts cannot publish straight to production. Google
requires a sustained closed test first — currently **12 testers opted in for
14 continuous days**. Organisation accounts are exempt; yours is personal.

> **12 is the number of people. 14 is the number of days.** They are easy to
> mix up. Recruit **14 or 15** anyway — the requirement is 12 opted in
> *continuously*, so a couple of spare people is what stops one person
> uninstalling from stopping the clock.

### ⚠️ Sending mates an APK does not count

This is the single most expensive misunderstanding available here. Google
counts **opt-ins recorded in Play Console**, and it can only see installs that
came through Play. An APK you sent someone over Drive or WhatsApp is invisible
to Google: brilliant for feedback, worth **zero** days of the fourteen.

The same goes for the **Internal testing** track. It is instant and takes up
to 100 testers, but it does **not** satisfy the requirement — only a *closed*
test does.

So the clock starts only once Steps 8 and 9 are done and a closed track is
live. That makes them the most time-critical steps in this document: every day
they wait is a day added to the end.

> ⚠️ **Do Step 3b first.** Twelve people signing in on the same afternoon is
> exactly what exhausts Supabase's built-in email service.

1. **Testing → Closed testing → Create track** (the default "Alpha" is fine)
2. **Testers** → create an email list and add **14–15 Gmail addresses**. It
   must be the Google account each person actually uses on their phone — a
   work address that isn't a Google account will not work
3. Upload `app-release.aab` → **Review release** → **Start rollout**
4. Copy the opt-in link from the **Testers** tab and send it to everyone

**What to send them**, so nobody has to guess:

> I've made an app for tracking agency shifts and what you're owed. Can you
> try it for a couple of weeks?
>
> 1. Tap this link on your phone: *(opt-in link)*
> 2. Tap **Become a tester**
> 3. Then tap the Google Play link on that same page to install it
>
> It needs the Google account you use on your phone. Please leave it installed
> for two weeks even if you don't use it much — that part matters more than
> the testing.

⚠️ **The count is opt-ins, not invitations.** A tester who never clicks the
link does not count, and the 14-day clock only advances on days when 12 are
opted in. If someone drops out on day 9, the clock does not simply pause —
chase them the same day.

⏱️ First review of a new app usually takes a few days. Updates to a closed
track after that are typically faster.

✅ **Testing → Closed testing** shows 12 testers and a running day count.

---

## Step 11 — While the 14 days run

Nothing here is urgent, but this is the only quiet window you will get.

- **Actually use it.** Log your own real shifts for two weeks. This is a
  better test than anything I can automate, because you will notice a wrong
  figure in a way a test never will.
- **Collect what testers say.** They will find the thing that is obvious to
  everyone but you — that is exactly what happened with the night rate.
- **Fix and re-upload freely.** Each new build needs `versionCode` bumped in
  `android/app/build.gradle` (1 → 2 → 3 …) and does not restart the 14 days.
- **Watch for crashes.** Play Console → **Quality → Android vitals**. There is
  no crash-reporting SDK in the app by design, so Vitals is your only view.

---

## Step 12 — Apply for production access

Once the 14 days are complete, Play Console shows a prompt to apply.

You will be asked, in writing, about:

- how you recruited testers and what feedback you got
- what you changed as a result
- who the app is for and why it is ready

Answer it properly — a thin answer gets bounced and costs you days. If you
kept notes in Step 11, this is twenty minutes.

⏱️ Google reviews the application. Expect days, not hours.

---

## Step 13 — Production rollout

1. **Production → Create new release**
2. Upload the AAB (bump `versionCode` again if you have rebuilt since)
3. **Countries / regions** — United Kingdom at minimum; the app is built
   around UK pay, holiday accrual at 12.07% and £ only
4. Release notes — plain English, what it does
5. **Review release → Start rollout to production**

Consider a **staged rollout** (20%) for the first release, so a serious bug
reaches a fraction of users while you fix it.

✅ Payweek is on Google Play.

---

## Step 14 — After it is live

| When | What |
| --- | --- |
| Day 1 | Install it from Play yourself, on a phone that never had the debug build |
| Weekly | Check **Android vitals** for crashes and ANRs |
| Every update | Bump `versionCode`, and keep the Data safety form true — see [DATA_SAFETY.md](DATA_SAFETY.md) |
| If you ever add analytics or crash reporting | You **must** update the Data safety declaration first. Shipping without is a policy violation |
| Annually | Google re-confirms developer identity; keep the account details current |

---

## If you get stuck

| What you see | What it means |
| --- | --- |
| `command not found` | Close the terminal, open a new one |
| "Missing VITE_SUPABASE_URL" | `.env` is missing or in the wrong folder |
| "requested path is invalid" on sign-in | Step 3 |
| "Try again in 7 minutes" on the sign-in button | Normal. Three links per address per 10 minutes; the link is already in an inbox or a spam folder |
| A tester says no email ever arrived | Step 3b — the built-in sender has run out |
| Gradle complains about Capacitor or SDK 35 | Step 5's fallback: `npx @capacitor/cli@7 migrate` |
| `SDK location not found` | Android Studio hasn't finished its first-run setup |
| Sign-in link does nothing on the phone | You opened the email on a different device |
| **A pay figure looks wrong** | **Stop. Send me the breakdown screenshot.** |

---

## Already done — don't touch these

| | |
| --- | --- |
| Play account | Created and verified |
| Database | Live in London, 5 tables, RLS on every one, advisors clean |
| Website | payweek.app over HTTPS, redeploys on every push, proper desktop layout |
| Privacy policy | Written, live, and matching the app's design |
| Account deletion page | `payweek.app/delete-account.html` — the web route Play requires alongside the in-app one |
| Sign-in | Username or email, plus a password. Username→email resolution happens in the `username-signin` Edge Function so nobody's address is exposed. No Google button — it was removed before launch |
| Account deletion | In-app, backed by the `delete-account` Edge Function (ACTIVE, v3). **Read the comment at the top of the function before redeploying it** — the CORS header echo and `verify_jwt = false` are both load-bearing and both look optional |
| Rate engine | Night, weekend, midnight-crossing shifts, breaks priced in the band they actually fall in |
| Offline | Shifts log with no signal and sync on reconnect (verified) |
| Play blockers in code | targetSdk 35, backups disabled, in-app deletion — all handled |
| App icon & splash | Generated for every Android density |
| Signing config | Wired — Step 7 only supplies the key |
| Play paperwork | Data safety answers and listing copy written |
| Tests | 148, all passing |

### Added since the APK on your phone was built

This is what Step 3c picks up. All of it came from someone actually using it.

| | |
| --- | --- |
| **Sign out** | Was a grey underline below the fold that the first person to look for it couldn't find. Now a button under your email address, and it asks twice if shifts are still queued to sync |
| **3 sign-in links per address per 10 minutes** | Live countdown on the form and on the "check your inbox" panel, plus a resend button so a lost link doesn't mean retyping your address. A send that failed on a flat signal costs nobody an attempt |
| **Keep me signed in** | Ticked by default. Unticked, the session dies when Payweek closes — for a shared or work computer |
| **Offline first-run** | Opening with no signal and nothing cached used to pulse grey blocks forever. It now says what has happened |
| **Money fields** | Accepted any number of digits, and a third decimal place made the payslip verdict vanish with no explanation. They now hold only what a money amount can be |
| **Usernames and passwords** | Creating an account asks for a username, an email and a password, and ends on a screen that shows the username back with a Sign in button. Signing in takes either the username or the email |
| **Password resets** | A forgotten password can't mean losing months of shifts. Reset link, and a screen to set a new one — including on Android, where the link arrives as an ordinary sign-in and needs telling apart |
| **Settings → Signing in** | Everyone so far signed up with a magic link and has neither a username nor a password. This is where they claim both |
| **The welcome** | Opening the registration email lands you inside the app with banknotes falling past a "You're in". Compositor-only, so it stays smooth on a cheap phone, and it holds still under reduced-motion |
| **No more sign-in links** | The email link belongs to registration now. Signing in is username and password |

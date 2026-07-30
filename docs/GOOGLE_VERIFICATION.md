# Google verification — what Payweek actually needs

*Researched 30 July 2026. Google changes these rules often — every claim below
is sourced, but check the console before acting on anything time-critical.*

Three separate things get called "Google verification". You need the first two.
You almost certainly **don't** need the third, which is worth knowing because
it's the one people waste days on.

| # | Thing | Needed for Payweek? | When |
| --- | --- | --- | --- |
| 1 | **Play Console developer verification** (your identity) | **Yes** | Before you can publish anything |
| 2 | **Android developer verification** (package registration) | **Yes**, but mostly automatic | Hard deadline **30 Sept 2026** |
| 3 | **Google OAuth verification** (the "Continue with Google" button) | **No** — see §3 | n/a |

Plus one thing that isn't verification but blocks you the same way:
the **12 testers × 14 days** rule (§4).

---

## 1. Play Console developer verification

This is proving to Google that you are a real, identifiable person before they
let you distribute software.

### Choose your account type first — this is hard to undo

**Personal account** (what you're signing up for):
- A **government photo ID** is required if your Google Payments profile hasn't
  already been verified
- A contact **phone number** and **email address**, both of which Google
  verifies. These are for Google to reach you and are *not* shown to users
- **$25 one-off** registration fee

**Organisation account** additionally needs:
- A **D-U-N-S number** (free from Dun & Bradstreet, but takes up to ~30 days)
- A verified organisation **website**
- Official government ID

> ⚠️ **Know this before you pick "personal":** Google displays your **legal
> name**, your **country**, and a **developer email address** publicly on your
> Play listing. For an individual that means your real name is on the store
> page. If that bothers you, an organisation account (a registered company)
> displays the company name instead — but that's a bigger undertaking and needs
> the D-U-N-S number. There is no way to publish anonymously.

### The step people miss: device verification

New personal accounts must **verify they have access to a real Android device
using the Play Console mobile app** before their app can go live. Install the
Play Console app on the phone you're testing Payweek with and sign in with the
same Google account — that satisfies it.

### What to do

1. Sign up at <https://play.google.com/console/signup>
2. Choose **Personal**, pay the $25
3. Upload ID when prompted; verify the phone and email
4. Install the **Play Console** mobile app on your Android phone, sign in
5. Check **Settings → Developer account** in Play Console — everything should
   read verified

**Timeline:** identity review typically takes a couple of days, but budget for
longer. Start it before anything else; the rest of the launch can proceed in
parallel.

**Sources:**
[Required information to create a Play Console developer account](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en) ·
[Verify your developer identity information](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en) ·
[Play Console Requirements](https://support.google.com/googleplay/android-developer/answer/10788890) ·
[View and manage your developer account information](https://support.google.com/googleplay/android-developer/answer/13634081)

---

## 2. Android developer verification (the 30 Sept 2026 deadline)

This is **new and separate** from the above. Google is requiring every app
installed on a certified Android device — including sideloaded ones — to be
registered to a verified developer.

### The timeline

- **March 2026** — rolled out to all developers via Play Console and the new
  Android Developer Console
- **June 2026** — regional enforcement details announced
- **30 September 2026** — **enforcement begins** in select stores and regions

### What it means for you

Two parts:

1. **Identity** — if you complete §1, you're done. Google states that for most
   developers the existing Play verification already satisfies this; just
   confirm your details under **Settings → Developer account**.
2. **Package name registration** — your app's package (`app.payweek`) must be
   registered to your account. Google auto-registered ~99% of existing Play
   apps, and **automatically registers the package name when you create a new
   app in Play Console**. So creating Payweek in Play Console handles this.

Check the status at **Play Console → Home → Android developer verification**.

### If you ever distribute outside Play

Sideloaded builds (handing an APK to a mate, or a non-Play store) must be
registered manually via the Android Developer Console, proving ownership with
the signed APK. Two tiers exist:

- **Full distribution** — unlimited apps and installs; required to publish
  outside Google Play
- **Limited distribution** — free, aimed at hobbyists and students, capped at
  **20 user-authorised devices**

**Consequence of missing the deadline:** global removal from Google Play and
loss of ability to distribute. Since creating the app in Play Console registers
the package automatically, following §1 covers you — but verify it rather than
assume.

**Sources:**
[Android developer verification](https://developer.android.com/developer-verification) ·
[Register on Google Play Console](https://developer.android.com/developer-verification/guides/google-play-console) ·
[Android Developers Blog — rolling out to all developers](https://android-developers.googleblog.com/2026/03/android-developer-verification-rolling-out-to-all-developers.html) ·
[Play Console PDF guide](https://developer.android.com/developer-verification/guides/pdf-guides/pdc-guide.pdf?hl=en)

---

## 3. Google OAuth verification — you can skip this

Payweek has a **"Continue with Google"** button, so it's reasonable to assume
you need Google's OAuth app verification. **You don't**, and here's the precise
reason.

### Why not

Verification and the notorious **100-user cap** are triggered by **sensitive**
or **restricted** scopes — Gmail, Drive, Calendar and similar. Payweek only
asks for who you are:

```
openid · userinfo.email · userinfo.profile
```

Google's documentation is explicit that apps requesting only this subset of
**non-sensitive** scopes need no verification, show **no warning screen**, and
have **no 100-user cap**, and their authorisations don't expire after 7 days.

### The one case where you'd want it

**Brand verification** — needed only if you want your **logo and display name**
shown on the Google consent screen. Purely cosmetic; without it the consent
screen shows a plainer prompt. It takes 2–3 business days and requires:

- Ownership of **every domain** in your OAuth config (homepage, privacy policy,
  redirect URIs)
- A homepage on a verified domain that describes the app
- A privacy policy **hosted on the same domain as the homepage** and linked
  from it

⚠️ **The Supabase catch.** Payweek signs in through Supabase, so the OAuth
redirect URI is `https://jcwxxtimhrlzaojadmhx.supabase.co/auth/v1/callback` —
a domain you don't own and can't verify in Search Console. If you ever *do* need
brand verification or a sensitive scope, that becomes a genuine blocker and
you'd need a custom auth domain on Supabase (a paid feature). Another reason to
leave this alone unless you have a concrete need.

Your `payweek.app/privacy.html` setup already satisfies the same-domain rule, so
you're in good shape if it ever comes up.

**Sources:**
[Unverified apps](https://support.google.com/cloud/answer/7454865?hl=en) ·
[OAuth App Verification Help Center](https://support.google.com/cloud/answer/13463073?hl=en) ·
[Verification requirements](https://support.google.com/cloud/answer/13464321?hl=en) ·
[Brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification) ·
[Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) ·
[OAuth 2.0 Scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes)

---

## 4. The 12 testers × 14 days rule

Not verification, but it gates production release just as hard, and it's the
single longest pole in your launch.

### The rule

A **newly created personal developer account** must run a **closed test with at
least 12 testers, opted in continuously for at least 14 days**, before it can
apply for production access.

History worth knowing: this began in **November 2023** at **20 testers**, and
Google reduced it to **12** in **December 2024** after individual developers
struggled to find enough people.

### What actually counts

- A tester counts only once they have **clicked the opt-in link and accepted**.
  Adding an email address to the list does nothing on its own — this is the
  most common way people lose days.
- The 14 days must be **continuous**. If your opted-in count drops below 12,
  the clock is affected — so chase anyone who un-enrols or never accepts.
- After 14 qualifying days, apply for production access from the Play Console
  **Dashboard**.

### Organisation accounts

The official page scopes this to *personal* accounts, and organisation accounts
are widely understood to be exempt — but there are enough community threads
asking about org accounts being asked for it that I'd treat it as "probably
exempt, confirm in your own console" rather than a guarantee.

### Practical advice

Start recruiting your 12 **now**, before the app is even built into an AAB.
They need Android phones and Google accounts. Family, workmates at the agency,
anyone. Send the opt-in link the day the closed track goes live and follow up
individually until you can see 12 accepted.

**Sources:**
[App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) ·
[Everything about the 12 testers requirement (community guide)](https://support.google.com/googleplay/android-developer/community-guide/255621488/everything-about-the-12-testers-requirement?hl=en) ·
[Clarification on releasing to production](https://support.google.com/googleplay/android-developer/thread/363352673/clarification-on-releasing-to-production-14-day-and-12-testers-requirement?hl=en)

---

## Your critical path

```
Day 0   Sign up, pay $25, upload ID           ← do first, it's the long pole
Day 0   Install Play Console app on phone     ← device verification
Day 0   Start recruiting 12 testers
Day 1-3 Identity verification clears
Day 3   Create app in Play Console            ← auto-registers app.payweek
        Complete App content + Data safety
Day 3   Upload AAB to closed testing, send opt-in links
Day 3+  Chase testers until 12 have accepted  ← the 14-day clock starts here
Day 17+ Apply for production access
```

The 14-day clock only starts once **12 people have actually accepted**, not
when you send the links. Everything else can be done while it runs.

## Two things that will trip you up

1. **The reviewer cannot receive your magic-link emails.** Payweek requires a
   login, so under **App content → App access** you must supply working
   credentials. Create a throwaway Gmail, sign in to Payweek with it once, and
   give Play that address with the instruction *"enter this email on the
   sign-in screen and open the emailed link."* Reviewers reject apps they can't
   get into.
2. **Your legal name goes on the public listing** with a personal account
   (§1). Decide now whether you're comfortable with that, because switching to
   an organisation account later is not a toggle.

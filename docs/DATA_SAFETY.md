# Play Console — Data safety answers

The exact answers for **App content → Data safety**, derived from what the code
actually does. Re-check this file whenever data handling changes; a Data safety
form that disagrees with the app's behaviour is a policy violation.

## Where these answers come from

| Claim | Evidence in the repo |
| --- | --- |
| Email is collected | `src/auth/SignIn.tsx` — magic link and Google sign-in |
| Shifts / agencies / rules / payslips are collected | `supabase/migrations/20260728000001_init.sql` |
| Data is sent off-device | `src/lib/supabase.ts`, `src/lib/queries.ts` |
| Data is encrypted in transit | Supabase client uses HTTPS only |
| Users can delete data | Delete actions in `AgencyDetail`, `ShiftDetail`, `PayslipCheck` |
| Users can export data | `src/lib/csv.ts`, Settings → Export shifts as CSV |
| No ads, analytics or tracking SDKs | No such dependency in `package.json` |

## Overview answers

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data is deleted? | **Yes** — in-app deletion, plus `privacy@payweek.app` for account deletion |

"Collected" here means the data leaves the device and reaches our server, which
it does — Payweek syncs to Supabase.

## Data types

Declare exactly these three. For every one: **Collected = Yes**,
**Shared = No**, **Processed ephemerally = No**, **Required (not optional)**,
purpose **App functionality** only.

### 1. Personal info → Email address
- Collected: Yes · Shared: No
- Purpose: **App functionality** (account creation and sign-in)
- Required: Yes

### 2. Personal info → Name
- Only if you keep the optional display-name field in Settings. It is optional
  for the user, so mark **Optional**.
- Collected: Yes · Shared: No
- Purpose: **App functionality**
- Required: No (users can leave it blank)

### 3. App activity → Other user-generated content
- Covers shifts, agencies, rate rules and payslip figures the user types in.
- Collected: Yes · Shared: No
- Purpose: **App functionality**
- Required: Yes

## Explicitly NOT collected

Answer **No** to all of these — nothing in the app touches them:

- Location (approximate or precise)
- Financial info — *payment info, purchase history, credit score*. Payweek
  stores pay **rates and expected gross amounts the user types in**, which
  Play classifies as user-generated content, not financial info. It never sees
  a card, bank account or transaction.
- Health and fitness · Messages · Photos and videos · Audio files · Files and
  docs · Calendar · Contacts
- App info and performance — no crash logs, no diagnostics, no analytics SDK
- Device or other IDs · Advertising ID

## Security practices section

| Question | Answer |
| --- | --- |
| Data is encrypted in transit | **Yes** — HTTPS between app and Supabase |
| Users can request data deletion | **Yes** |
| Committed to Play Families Policy | Not applicable (not a children's app) |
| Independent security review | **No** |

## Account deletion (required URL)

Play requires a way to request account deletion from outside the app. Provide:

- **Deletion URL:** `https://payweek-self.vercel.app/privacy.html` (live; swap to the payweek.app
  address once attached). The *Your rights* section carries the deletion
  contact.
- What is deleted: the account and all agencies, rate rules, shifts and
  payslips belonging to it
- What is retained: nothing

If you later add a self-serve "Delete my account" button in Settings, update
this section and the privacy policy together.

## Keeping it honest

Two changes would make these answers wrong — if either happens, update this
file and the Play form before shipping:

1. **Adding any analytics or crash reporting** (Firebase, Sentry, …) → you must
   then declare *App info and performance* and probably *Device or other IDs*.
2. **Adding net-pay/tax estimation that ingests real payslip documents or bank
   data** → may cross into *Financial info*, and Play's financial-features
   declaration would need revisiting.

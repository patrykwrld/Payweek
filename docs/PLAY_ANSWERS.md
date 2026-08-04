# Play Console — the answer sheet

Every field Play asks for, with the answer already decided. Work top to bottom
with this open. Nothing here needs a judgement call from you.

Play moves these sections around between accounts, so go by the **name** of the
section rather than its position in the list.

---

## Do this first — the reviewer account

**App access** is the item most likely to get Payweek rejected, and it is the
only one that needs work outside Play Console. Do it before you open the forms
so it isn't sitting half-done when you get there.

1. In the app (or at payweek.app), **Create an account**:
   - Username `payweek_review`
   - An email **you** can open — a real Gmail, not `@example.com`
   - A password you don't use anywhere else
2. **Open the confirmation email yourself.** The reviewer will never see an
   inbox, so the account has to be confirmed before you hand it over.
3. Add one agency with a normal rate, and log two or three shifts. A reviewer
   who lands on an empty screen can't tell a working app from a broken one.
4. **Sign out, then sign back in with the username and password.** That is the
   exact path the reviewer takes. If it works for you it works for them.

Keep the password somewhere you can read it back — you paste it in below.

---

## App content

Play Console → **Policy → App content**.

### Privacy policy

```
https://payweek.app/privacy.html
```

### App access

Choose **All or some functionality is restricted**.

Add one instruction set:

| Field | Value |
| --- | --- |
| Name | `Signed-in access` |
| Username | `payweek_review` |
| Password | *(the password you set above)* |

Any other instructions:

```
Open the app and tap Sign in. Enter the username and password above, then tap
Sign in. No email confirmation or verification code is needed — this account is
already confirmed.

Everything in the app is behind this one screen. Once signed in, the whole app
is available, including Settings → Delete my account.
```

### Ads

**No**, the app does not contain ads. There is no ad SDK in the project.

### Content ratings

Fill in the questionnaire. Answers:

| Question | Answer |
| --- | --- |
| Email address | `privacy@payweek.app` |
| Category | **Utility, Productivity, Communication or Other** |
| Violence, sexuality, language, controlled substances | **No** to every one |
| Gambling, simulated gambling, contests | **No** |
| User-generated content shared with others | **No** — shift data is private to the account |
| Users can interact / share location / share personal info | **No** to all three |
| Digital purchases | **No** |

Expected result: **PEGI 3 / Everyone**. That is correct — nothing in Payweek is
age-sensitive.

### Target audience and content

| Question | Answer |
| --- | --- |
| Target age groups | **18 and over**, and only that |
| Could the app appeal to children? | **No** |
| Ads/content appealing to children | Not asked once you've said 18+ only |

18+ is the honest answer: it is a tool for people in paid work, and selecting
any younger band pulls in the Families policy and a lot of extra requirements
for no benefit.

### Data safety

The long one, ~15 minutes. Full detail in [DATA_SAFETY.md](DATA_SAFETY.md);
this is the short form.

**Overview:**

| Question | Answer |
| --- | --- |
| Does your app collect or share any required user data types? | **Yes** |
| Is all user data encrypted in transit? | **Yes** |
| Do you provide a way for users to request their data is deleted? | **Yes** |
| Account deletion URL | `https://payweek.app/delete-account.html` |

> ⚠️ The deletion URL is **not** the privacy policy URL. They are separate
> fields and swapping them is a known rejection.

**Declare exactly four data types.** For every one:
Collected **Yes** · Shared **No** · Processed ephemerally **No** ·
Purpose **App functionality** and nothing else.

| Data type | Where | Required? |
| --- | --- | --- |
| Email address | Personal info | **Required** |
| User IDs | Personal info — the username | **Required** |
| Name | Personal info — the optional display name in Settings | **Optional** |
| Other user-generated content | App activity — shifts, agencies, rates, payslip figures | **Required** |

**Answer No to everything else**, in particular these three, which look like
they might apply and don't:

- **Financial info** — Payweek stores pay rates and expected gross that the
  *user typed in*. It never sees a card, a bank account or a transaction. Play
  classifies typed-in figures as user-generated content.
- **App info and performance** — no crash reporting, no diagnostics, no
  analytics SDK. Deliberately.
- **Device or other IDs** — none, including no advertising ID.

**Security practices:**

| Question | Answer |
| --- | --- |
| Encrypted in transit | **Yes** |
| Users can request deletion | **Yes** |
| Independent security review | **No** |

### Advertising ID

**No** — the app does not use an advertising ID. (If Play asks you to confirm
after the Data safety form, this is the matching answer.)

### Government apps

**No**.

### Financial features

**No** — select *My app does not provide any financial features*. See the note
under Data safety for why.

### Health

**No**.

### News apps

**No**.

---

## Store listing

Play Console → **Grow users → Store presence → Main store listing**.
All copy is in [STORE_LISTING.md](STORE_LISTING.md); all images are in
`assets/play/`.

| Field | Value |
| --- | --- |
| App name | `Payweek: Hours & Pay Tracker` |
| Short description | STORE_LISTING.md — 73 chars, paste as-is |
| Full description | STORE_LISTING.md — paste as-is |
| App icon | `assets/play/icon-512.png` |
| Feature graphic | `assets/play/feature-graphic.png` |
| Phone screenshots | `assets/play/screenshots/` — all six, in the numbered order |
| Tablet screenshots | Skip. Optional, and Payweek is a phone app |
| Video | Skip |

Then **Store settings**:

| Field | Value |
| --- | --- |
| App category | **Productivity** |
| Tags | time tracking, timesheet, payroll, shift work |
| Email address | `privacy@payweek.app` |
| Website | `https://payweek.app` |
| Phone | Leave blank — optional, and it gets published |
| External marketing | Leave unticked |

---

## When both are green

Go straight to **Step D** in [LAUNCH_DAY.md](LAUNCH_DAY.md) — closed testing.
That is the one that starts the 14-day clock, and every day it waits is a day
added to the end.

---

## If something is stuck grey

| What you see | What it is |
| --- | --- |
| "App content" won't go green | One item is saved but not *submitted* — open it and press Save at the bottom |
| Content rating shows no rating | The questionnaire was filled in but not submitted on the final page |
| Data safety keeps reopening | A data type was ticked in the list but its detail page was never completed |
| Store listing rejects the icon | It must be 512×512 PNG with **no transparency** — `assets/play/icon-512.png` already is |
| Screenshot rejected on ratio | Play wants 2–8 phone screenshots, 9:16, min 320px short side. The six in the repo are 1080×1920 |

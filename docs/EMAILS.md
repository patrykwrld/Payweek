# The emails, and who gets which

Checked against the database on 26 Sep 2026. **You have three lists, not one**,
and they need different emails — the difference between them is whether the
person ever asked to hear from you.

| List | How many | Asked to hear from you? |
| --- | --- | --- |
| Payweek account holders | **22 confirmed** (23 accounts) | Yes — they signed up inside your app |
| Waitlist (`launch_signups`) | **1**, from 22 Aug | Yes, explicitly |
| Colleagues from work | 14 | **No** — that list was for work |

Of the 22 account holders:

- **12 signed up and never logged a single shift**
- **6 logged between one and four**
- **5 logged five or more** — these are your only real users
- **2 have opened it in the last 30 days**

Nobody, across the whole database, has ever run a payslip check.

---

## Before you send anything

**BCC. Never CC.** Twenty-two addresses in the To or CC field shows everyone
else's email to all of them. That is a real data-protection breach, it is the
most common one there is, and it cannot be undone once sent.

**Send it from your normal Gmail, as plain text.** Not Mailchimp. At this size
a marketing tool actively hurts: it adds a tracking pixel and an unsubscribe
footer, it lands in the Promotions tab, and it makes a bloke asking a favour
look like a company running a campaign. Gmail's limit is ~500 a day, so 22 is
nothing.

**Pull the addresses** (Supabase → SQL editor):

```sql
select string_agg(email, ', ' order by created_at) as bcc
from auth.users where email_confirmed_at is not null;
```

And, for the five worth writing to personally:

```sql
select u.email, count(s.id) as shifts, u.last_sign_in_at::date as last_seen
from auth.users u join public.shifts s on s.user_id = u.id
group by 1, 3 having count(s.id) >= 5 order by 2 desc;
```

---

# 1 · The ask — to all 22, BCC

Send this now. It leads with the favour because, as of today, that is the only
thing that is actually true: **version 1.1.0 is built but not uploaded**, so
everybody on this list is still looking at the August build. Email 2 is the one
that talks about the update, and it goes out after the upload.

**Subject:** `A one-minute favour, if you're on Android`

```
Hi — you made a Payweek account over the summer. I'm the bloke who built it,
and this is the only time I'll email the lot of you at once.

I need a favour, and it costs about a minute.

Google won't let me release Payweek properly until twelve people have joined
the test and stayed in it for a fortnight. That's the only thing standing
between this and being a normal app you can find in the Play Store. I'm not
at twelve yet.

If you're on Android:

    payweek.app/test

Two steps, and the page walks you through both. Use whichever Google account
your Play Store is signed in to or it won't find the app.

Two honest notes:

- You don't have to actually use Payweek for it to count. Joining is the bit
  Google measures. No hard feelings either way.
- If you do join, please leave it installed for two weeks. If the count drops
  below twelve the fortnight starts again from zero, which is what's happened
  to me once already.

It's free, there are no adverts, and nothing about your hours goes anywhere.

Thanks,
Patryk

---
Don't want emails from me? Reply with "stop" and you're off the list.
```

---

# 2 · What's new — same 22, BCC

**Do not send this until version 1.1.0 is live on the closed track**
(`docs/UPLOAD_NOW.md`). Until then it describes screens nobody can open, and
the first person to go looking will find the old app.

Leave at least ten days between this and email 1.

**Subject:** `Payweek looks quite different now`

```
Hi — quick one. Payweek's had the biggest update it's had since you signed up,
and it'll have updated itself in the background, so it's worth a look.

What changed:

- The home screen shows what each day of the week earned, not just one total
  for the week. You can see at a glance which shifts were actually worth doing.
- Tap any shift and it shows exactly how the pay was worked out — base rate,
  night rate, weekend rate, and which band the unpaid break came off.
- Payday is a timeline now: what's coming, what's landed, and what came up
  short.
- Logging a shift is faster, and the clock-in survives closing the app.

The one thing nobody has tried yet is the payslip check — you put in what you
were actually paid and it tells you whether it matches the hours you logged.
That's the part I most want to be wrong about, so if you've got a payslip to
hand I'd genuinely like to know what it says.

Reply to this and it comes straight to me.

Patryk

---
Don't want emails from me? Reply with "stop" and you're off the list.
```

---

# 3 · The five who actually use it — send individually

Five people have logged five or more shifts. They are worth more to you than
the other seventeen put together, and a personal email gets a reply where a
BCC never will. **Send these one at a time, with their name on, and change a
line each** so it reads as written rather than mailed.

**Subject:** `Quick question about Payweek`

```
Hi <name> — you're one of about five people genuinely using Payweek, which
means you know more about whether it works than I do.

One question, and there's no wrong answer: have you ever compared what
Payweek said a week was worth against what actually landed in your bank?

I ask because nobody has ever used the payslip check — not one person — and
it's the feature the whole thing is built around. Either it's buried where
nobody finds it, or it's asking for something people don't have to hand, or
it's just not the thing I think it is. I can't tell from here.

If you've got two minutes to tell me which, it'd change what I build next.
And if it's simply that the app annoys you in some way, that's the most useful
answer of the lot.

Cheers,
Patryk
```

---

# 4 · The fourteen from work — individually, or not at all

These people gave you their email **for work**, not for your app. Mailing the
list is using their details for something they weren't given for, and it is
the one send here that could genuinely come back on you.

Two ways round it, both better than a BCC:

- **Ask them in person** and do the opt-in with them standing there. This has
  the highest completion rate of anything in `docs/GROWTH.md` and needs no
  email at all.
- **Message the ones you'd actually message anyway**, one at a time, as
  yourself:

```
Alright <name> — random one. I've built an app that works out what your shifts
should pay, nights and weekends and all that, and tells you if your payslip's
come up short.

Google won't let me put it out properly until 12 people have joined the test.
You on Android? It's payweek.app/test, takes a minute, and you don't have to
use it for it to count.

No worries if not.
```

Do not BCC all fourteen.

---

## What to expect

Twenty-two emails will not produce twenty-two testers. A good personal send to
a warm list gets somewhere around a quarter replying and fewer acting, so plan
on **four or five from email 1** — worth having, nowhere near enough on its
own. It runs alongside the in-person asks and the stories, it doesn't replace
them.

Send it on a weekday evening, around 7–9pm. Shift workers read their phone
then.

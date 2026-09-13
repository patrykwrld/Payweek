# Tester invitation

Copy for getting 14 people through the three taps that Play counts. Written to
do one job and no other: remove every reason to not tap.

## First: the one-tap flow only works if you set it up for it

Closed testing is invite-only, and Play decides who is invited by looking at a
**tester list**. There are two kinds of list, and which one you pick decides
whether a stranger can join by themselves.

| | Email list | **Google Group** |
| --- | --- | --- |
| Who can join | only addresses you typed in | anyone who joins the group |
| Works for a Facebook stranger | **no** | **yes** |
| You need their Gmail first | yes | no |
| Adding someone | you, in Play Console | them, on their own |
| Good for | the 14 people you know | posting in public |

**With an email list, "just tap the link and become a tester" does not work
for someone you have never met.** Their address is not on the list, so the
opt-in page tells them *"item not found"*, and you have spent your one good
ask. That is the flow written in the Facebook posts, and it only holds up if
you use a Google Group.

Use both: the email list for people you know, and the group for anything
posted in public.

---

## Route B — the Google Group, so strangers can join themselves

Do this once. It takes about ten minutes and it is what makes the group posts
work at three in the morning without you.

### 1. Make the group

<https://groups.google.com> → **Create group**

- **Name:** Payweek Testers
- **Group email:** `payweek-testers@googlegroups.com` (whatever is free)
- **Who can join group:** **Anyone on the web can join**

That last setting is the whole point — it is what makes this self-serve. The
alternative, *Anyone can ask to join*, means every single person waits on you
to approve them, which is the same bottleneck as the email list with extra
steps. Only choose it if you start getting junk.

Also set **Who can post** to *Group owners and managers*, or you have
accidentally created a public mailing list that anyone can spam.

### 2. Point Play Console at it

Play Console → **Test and release → Testing → Closed testing** → your track →
**Testers** tab → choose **Google Groups** → enter
`payweek-testers@googlegroups.com` → **Save**.

### 3. Copy the opt-in link

Same **Testers** tab, at the bottom. It looks like
`https://play.google.com/apps/testing/app.payweek` — copy the real one rather
than typing that, in case Play has given the track a different form.

### 4. Share both links, in this order

There are two taps, not one, and pretending otherwise is what generates
confused replies:

> **1.** Join the group: `https://groups.google.com/g/payweek-testers`
> **2.** Then open this and tap *Become a tester*: *(opt-in link)*
> **3.** Then tap the Google Play link on that page to install.

Put them in that order every time. Someone who opens the opt-in link before
joining the group sees *"item not found"* and usually gives up rather than
scrolling back for step one.

### What people get wrong

- **The Google account has to match.** They must join the group with the same
  Google account their phone's Play Store is signed in to. This is the single
  most common failure, and it is worth saying in the message.
- **Joining the group is not opting in.** The group only grants permission to
  see the app. Play counts people who then tapped **Become a tester**. Someone
  can be in the group and count for nothing.
- **Membership can take a few minutes to reach Play.** If a tester gets *"item
  not found"* immediately after joining, have them wait ten minutes and try
  again before you start debugging.
- **Installing has to happen through Play.** An APK sent over WhatsApp counts
  for zero.

### Checking the count

Play Console → Closed testing → your track. The number that matters is the
count of testers who have **opted in**, and the requirement is **12,
continuously, for 14 days**. Recruit 15 so one person uninstalling does not
reset the clock.

---

## Before you send anything (Route A — the email list)

**Add all 14 addresses to the tester list first.** Play Console → Test and
release → Testing → Closed testing → **Testers** → your email list → paste →
**Save**.

If somebody opens the link before their address is on the list, they get
*"item not found"*, and you have spent your one good ask on a dead end. You
rarely get a second tap out of the same person.

Paste them in **lowercase**. Gmail ignores case, but the Play Console list is a
plain string match and there is no reason to find out the hard way.

Then copy the real opt-in link from the bottom of that same Testers tab. It
looks like `https://play.google.com/apps/testing/app.payweek` — copy the actual
one rather than typing that, in case Play has given the track a different form.

## How to send it

**Use BCC**, not To. These are fourteen people's personal addresses and most of
them don't know each other. Putting them all in the To field publishes every
address to every recipient, which is both rude and the kind of thing that ends
up being a data-protection question.

Send from `privacy@payweek.app` or your own Gmail — either is fine. **Don't
dress it up in HTML.** A plain message from a person gets read and lands in the
inbox; a branded template with a big button lands in Promotions and reads like
marketing, which is the opposite of what this is.

---

## The email

**Subject:**

```
Can you help me test my app? Takes 2 minutes
```

**Body:**

```
Hi,

I've built an app called Payweek. It works out what you're owed for the
shifts you've worked, and tells you whether your payslip is short.

It's ready to go on Google Play, but Google won't let me publish it until
12 people have had it installed for two weeks. That's the only reason I'm
asking — I need twelve, and I'm asking fourteen in case a couple can't.

You don't have to use it. You just need to install it and leave it on your
phone for two weeks. That is genuinely the whole favour.

Two minutes, on an Android phone:

1. Tap this link on your phone: <PASTE YOUR OPT-IN LINK>
2. Tap "Become a tester"
3. Tap the Google Play link on that same page, and install

Two things that trip people up:

- It has to be an Android phone. iPhones can't install it at all.
- You need to be signed in to the Gmail address I sent this to. That's the
  one I've registered, and no other account will see the app.

If you do fancy actually trying it, I'd genuinely love to hear what you
think — but no pressure, the install is the bit that helps.

Thanks a lot,
Patryk
```

## The WhatsApp version

Realistically this is what will convert. Send it to the people you actually
talk to, and send the email to the rest.

```
Mate — favour. I've built an app and Google won't let me publish it until 12
people install it for two weeks. You don't have to use it, just install it
and leave it there.

Android only, 2 mins:
1. Tap this on your phone: <LINK>
2. Tap "Become a tester"
3. Then tap the Play Store link on that page and install

Has to be the Gmail you use on your phone. Cheers 🙏
```

## The follow-up, two days later

Do send this. Roughly half of any group means to and forgets, and a single
nudge is usually worth three or four more opt-ins.

```
Hi,

Sorry to nag — I'm still a few people short and Google's clock doesn't start
until I hit twelve.

If you haven't had a chance: <LINK>, tap "Become a tester", then install
from the Play Store link on that page. Android phone, and the Gmail I sent
this to.

If you've already done it, thank you, and ignore me.

Patryk
```

## Check who actually did it

The **Testers** tab shows the opted-in count, and so does the Production panel
on the dashboard. Refresh it after each conversation — you find out exactly who
tapped and who only said they would, which is the whole reason to ask people
one at a time rather than blasting all fourteen at once.

⚠️ **The count has to stay at 12 or above for 14 continuous days.** If someone
uninstalls at day 9 you drop to 11 and the clock stalls until you are back up.
That is what the two spare testers are for.

---

# When you run out of people you know

The iPhone problem is real and it is arithmetic: an iPhone user cannot opt in,
so they are worth zero no matter how willing they are. Count the Androids on
your list first. If that number is under 12, no amount of following up moves
the counter and you need more names.

## The one thing to understand before using swap communities

**Twelve people who install and never open the app can still get the
production application rejected.** Step F asks, in writing, how you recruited
testers and what feedback you got. A wall of silence is a thin answer, and a
thin answer costs days.

So the mix matters:

| Source | Gets you past the counter | Gives you something to write in Step F |
| --- | --- | --- |
| People you work with | Slowly | **Yes — they are your actual users** |
| Family with an Android | Yes | Rarely |
| Swap communities | **Fast** | Almost never |

Use swaps to make up the number, not to make up the whole twelve.

## Where the swaps are

These communities exist specifically because every solo developer hits this
wall. Real people, real devices, usually same-day.

- **Reddit** — r/AndroidAppTesters, r/alphaandbetausers, r/testerscommunity,
  r/androidapptesting. Post the opt-in link and offer to test theirs back.
- **Discord and Telegram** — several servers run closed-testing exchange
  channels. Faster than Reddit because it is conversational.
- **Credit-based exchange platforms** — test other people's apps to earn
  credits, spend credits to get testers on yours.

Reciprocate properly. These run on people actually doing it back, and the
regulars remember who did not.

## What to post

```
[Closed testing] Payweek — UK agency shift & pay tracker (Android)

Need a few more testers to finish the 14-day closed test. Happy to
reciprocate — drop your link and I'll opt into yours today.

What it does: works out what you're owed for the shifts you've worked and
tells you if your payslip is short. Night rates, weekend rates, shifts past
midnight.

Opt-in: <LINK>

Please leave it installed for the full 14 days — the count has to stay above
12 continuously.
```

## Churn is the thing that bites

Swap testers opt in and drift off far more than people you know. The
requirement is 12 **continuously** — one uninstall on day 9 stalls the clock
until you are back above 12.

So: recruit to **15 or 16** if a chunk of them came from swaps, and check the
count every day rather than at the end.

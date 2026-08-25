# The posts, ready to publish

Three finished units. Each one is an image, a caption to paste, and a link
with its own tag so you can tell afterwards which one worked. Nothing here
needs writing — only posting.

Regenerate the images after any brand change:

```sh
npx vite --port 5199
node scripts/make-posts.mjs
```

A note that applies to all three: **every figure in these is the app's own
arithmetic**, taken from the same fixture the screenshots and the film use.
£50.63 plus £60.75 is £111.38. £467.53 minus £437.53 is £30.00. If you change
a number in a caption, change it in the graphic too, or the first person who
adds it up in the comments will be right and you will be wrong.

---

## Post 1 — "Would you have noticed?"

**Image:** `post-short-payslip.png` · 1080×1350
**Where:** Facebook groups, Instagram feed
**Link:** `payweek.app/?s=fb-short` (or `?s=ig-short` on Instagram)
**Job:** stop the scroll. This is the one that gets shared and argued with.

> Genuine question for anyone on agency work.
>
> Do you actually check your payslip, or do you just look at the number and
> hope?
>
> I stopped hoping after I worked out one of mine was thirty quid light. Four
> shifts, two of them running past midnight — and once you're splitting hours
> across a night rate and taking breaks off the right band, working out what a
> week *should* have paid is genuinely hard. Hard enough that most of us
> don't, which is exactly why it goes unnoticed.
>
> So I built something that does it for me. It's free, there are no ads and it
> doesn't track anything — I'm not making money from this, I just got sick of
> not knowing.
>
> payweek.app

**If the group bans links:** delete the last line and put it in the first
comment instead. Most admins tolerate that; almost none tolerate a link in the
post body.

---

## Post 2 — "What does a shift past midnight actually pay?"

**Image:** `post-night-shift.png` · 1080×1350
**Where:** Facebook groups (especially nights and 4-on-4-off groups),
Instagram
**Link:** `payweek.app/?s=fb-nights`
**Job:** be useful without asking for anything. Post this one *second*, a day
or two after Post 1, in the same groups.

> 18:00 to 02:00. Eight hours on the clock, half an hour unpaid. What should
> that pay?
>
> On £13.50 base with a £16.20 night rate from 22:00, it's £111.38 — 3h45 at
> the day rate and 3h45 at nights, with the break coming off the band it
> actually fell in rather than off the whole shift.
>
> Most people guess. I did for years. And guessing is how thirty quid goes
> missing and nobody ever argues about it, because nobody can prove it.
>
> If your rates are different the split is different — the point is that
> there *is* a split, and "8 hours × my hourly rate" is almost never the
> right answer.

Deliberately no call to action. The footer of the image carries the address;
the post itself is just worth reading. This is the one that earns you the
right to post the other two.

---

## Post 3 — "Can you tap a link?"

**Image:** `post-tester-ask.png` · 1080×1080
**Where:** Facebook groups where you have already posted something useful,
WhatsApp, anyone you work with
**Link:** the Play closed-testing link (not payweek.app — this one needs to
land on the opt-in page)
**Job:** the twelve testers. This is the only post that touches the actual
blocker.

> Anyone here on Android and up for a 30-second favour?
>
> I work agency and got sick of never knowing whether my payslip was right, so
> I built a free app that works out what each shift should pay — night rates,
> weekend rates, breaks, shifts that run past midnight — and tells you if the
> payslip comes up short.
>
> Google won't let me release it until 12 people have joined the test. You
> don't have to use it. You tap the link, tap "Become a tester", and that's
> it — it counts.
>
> No ads, no tracking, and it'll stay free. Happy to answer anything.

**Post this one last**, and only in groups where you have already contributed
something. An ask from a stranger who has never posted gets removed; an ask
from someone whose last post was Post 2 gets helped.

---

## Order and spacing

| When | Post | Where |
| --- | --- | --- |
| Day 1 | Post 3 (tester ask) | WhatsApp, and the two friendliest groups |
| Day 1 | Post 1 (would you have noticed) | 2–3 groups, spaced through the day |
| Day 3 | Post 2 (night shift) | the same groups, plus 2 new ones |
| Day 5 | Post 3 again | new groups only — never the same group twice |

**Never paste the same text into several groups within a few minutes.** That
is the precise pattern Facebook's spam detection looks for. Space them hours
apart and change a sentence each time — the first line especially.

## Reading the results

```sql
select coalesce(source, 'unknown') as came_from,
       count(*) as signups,
       max(created_at) as latest
from public.launch_signups
group by 1
order by signups desc;
```

Tester opt-ins do not appear here — those are counted in Play Console, and
they are the number that decides whether this fortnight worked.

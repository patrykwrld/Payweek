# November campaign — getting to 20 testers

The goal is **20 opted-in testers**, not 12. At exactly 12, one person
uninstalling resets the 14-day clock. Everything below points at
**payweek.app/test**.

Every figure in every asset is the app's own arithmetic from the shots
fixture. If a caption and a graphic disagree, the graphic is right — fix the
caption.

## The assets

| File | Size | Where |
| --- | --- | --- |
| `assets/video/short-1-thirty-pounds-short.mp4` | 1080×1920 · 14s | Reels, TikTok, Shorts, WhatsApp status |
| `assets/video/short-2-what-actually-lands.mp4` | 1080×1920 · 15s | Reels, TikTok, Shorts |
| `assets/video/short-3-tester-ask.mp4` | 1080×1920 · 14s | Reels, TikTok, Stories, WhatsApp status |
| `assets/video/payweek-film.mp4` | 1080×1920 · 70s | Facebook, YouTube, pinned post |
| `assets/posts/post-8-take-home.png` | 1080×1350 | Instagram feed, Facebook |
| `assets/posts/post-9-tester-ask-pl.png` | 1080×1080 | Polish Facebook groups |
| `assets/posts/post-3-tester-ask.png` | 1080×1080 | English groups |
| `assets/social/story-ask.png` | 1080×1920 | Instagram story with a link sticker |

Regenerate after any UI change:

```sh
npx vite --port 5199
node scripts/make-posts.mjs && node scripts/make-stories.mjs
node scripts/film-shorts.mjs
```

## Profile banners

One handle everywhere: **@payweek.app** (X does not allow dots: **@payweekapp**).

| File | Where |
| --- | --- |
| `assets/banners/x-header-1500x500.png` | X → Edit profile → header |
| `assets/banners/facebook-cover-1640x720.png` | Facebook Page → Edit cover photo |
| `assets/banners/youtube-banner-2560x1440.png` | YouTube Studio → Customisation → Banner image |
| `assets/banners/avatar-1024.png` | The profile picture on every platform |

TikTok, Instagram, Threads and WhatsApp channels have no banner; they take
the avatar only. Regenerate with `node scripts/make-banners.mjs`, which
refuses to write a banner whose text would be cropped on a phone or sit
under the profile picture.

## Seven days

Post once a day, around 19:00–21:00 when shifts end. Reply to every comment
within the hour — early replies are what the feed algorithms reward.

| Day | Post | Where |
| --- | --- | --- |
| 1 | `short-1` | Reels + TikTok + WhatsApp status |
| 2 | `post-9` (Polish) | 2–3 Polish UK Facebook groups — **ask the admin first** |
| 3 | `short-3` | Reels + TikTok + Story with link sticker |
| 4 | `post-8` | Instagram feed + Facebook |
| 5 | `short-2` | Reels + TikTok |
| 6 | `payweek-film` | Facebook + YouTube |
| 7 | `short-3` again | Stories only — new followers haven't seen it |

Every day, alongside the post: message five people directly. One-to-one asks
convert far better than any post.

## Captions

### short-1 · £30 short

> My agency paid me £437.53. My hours came to £467.53.
>
> I'd never have noticed without checking. So I built a free app that does
> the checking — nights, weekends, breaks, the lot.
>
> Android testers wanted 👉 payweek.app/test
>
> #agencywork #nightshift #payslip #ukjobs #warehousejobs

### short-2 · what actually lands

> £622 on the timesheet. £515.67 in your pocket.
>
> Put your tax code in and it works out tax, NI, student loan and pension
> for every week. An estimate — so you've got something to check the payslip
> against.
>
> Free, no ads 👉 payweek.app
>
> #agencyworker #takehomepay #ukpay #nightshift

### short-3 · the ask

> I built an app for agency workers. Google won't put it in the Play Store
> until 12 people test it for 14 days.
>
> Two taps. You don't even have to use it — just don't uninstall it.
>
> 👉 payweek.app/test (Android only)

### post-9 · Polish groups

> Pracujesz przez agencję w UK? Zrobiłem darmową apkę, która liczy, ile
> powinieneś dostać za każdy tydzień — nocki, weekendy, przerwy — i pokazuje,
> kiedy payslip się nie zgadza. Bez reklam, nic nie idzie do agencji.
>
> Google wymaga 12 testerów przez 14 dni, zanim wpuści ją do sklepu.
> Potrzebuję kilku osób z Androidem: dwa kliknięcia, nie musisz nawet
> używać — wystarczy nie odinstalować przez dwa tygodnie.
>
> 👉 payweek.app/test

### Direct message

> Need a favour that takes one minute. Google won't release my app until 12
> people have it installed for 14 days. You don't have to use it — just join
> and don't uninstall for two weeks. payweek.app/test

## Rules

- **Never say Payweek calculates tax, or that its figure is a payslip.** Say
  *estimate*. It is on every graphic for a reason.
- **Ask group admins before posting.** A removed post in a 40k-member group
  costs more than not posting there.
- **Do not buy followers, likes or testers.** Paid testers do not give
  feedback, and Google asks about feedback when you apply for production.
- **Write down what testers report.** The production application asks what
  you learned from the closed test and what you changed.

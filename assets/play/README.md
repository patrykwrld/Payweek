# Play Console assets

Everything the store listing needs, ready to upload. Sizes are already exactly
what Play wants, so nothing here gets resampled or rejected.

| File | Where it goes | Size |
| --- | --- | --- |
| `icon-512.png` | Store listing → **App icon** | 512×512 |
| `feature-graphic.png` | Store listing → **Feature graphic** | 1024×500 |
| `screenshots/*.png` | Store listing → **Phone screenshots** | 1080×1920 (9:16) |

## Upload the screenshots in this order

Play shows the first two or three in search results and above the fold. The
order is chosen so somebody scrolling past learns what the app is from the
first tile, and why it is different from the second.

| # | File | Says |
| --- | --- | --- |
| 1 | `1-week-total.png` | Know what you're owed before payday |
| 2 | `2-how-it-was-worked-out.png` | See exactly how it was worked out |
| 3 | `3-night-weekend-rates.png` | Night and weekend rates, priced properly |
| 4 | `4-shifts-by-week.png` | Every shift, grouped by pay week |
| 5 | `5-payday.png` | What's landing, and when |
| 6 | `6-payslip-check.png` | Check your payslip against your hours |

Play requires at least two. Use all six.

## What's actually in them

Real screens from the real app, captured at 1170×2532 and composed onto a
1080×1920 canvas. Nothing is mocked up or drawn — Play requires screenshots to
represent the app honestly, and a listing that oversells gets found out in the
reviews anyway.

The data is a fictional agency, **Meridian Staffing**, on plausible UK agency
rates: £12.85 base, £15.60 nights from 22:00, £17.25 weekends. The week shown
totals £628.29 across 42h 15m, and includes two shifts running past midnight
and a Sunday night that hits both the weekend and the night rule — which is
exactly the case the rate engine exists for.

## Remaking them

Everything is scripted, so a design change doesn't mean redoing this by hand:

1. Run the local Supabase stand-in and build the app against it
2. `seed.mjs` — writes the fictional agency, rates and a week of shifts,
   dated relative to today so the current pay week is never empty
3. `raw-shots.mjs` — drives the app and captures the six screens
4. `compose.mjs` — lays each one onto the 1080×1920 canvas with its caption

The scripts live in the working scratchpad rather than the repo, since they
depend on the local stand-in. Ask and they can be regenerated.

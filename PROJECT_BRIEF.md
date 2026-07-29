# CLAUDE CODE KICKOFF PROMPT — PAYWEEK

Save this file as `PROJECT_BRIEF.md` in an empty folder and tell Claude Code to read it and start Phase 1.

---

## Project

Build **Payweek** (domain: payweek.app) — an hours & earnings tracker for agency workers paid weekly. An Android app (Capacitor-wrapped web app) that logs shifts across multiple agencies, calculates expected gross pay with flexible rate rules, and diffs expected pay against actual payslips to catch underpayment.

## Brand & positioning

- Name: **Payweek**. Play Store title: "Payweek: Hours & Pay Tracker". Tagline: "Know what's in your packet."
- Positioning: radically simple. Competitors (Graft, Shifter, Work Log) are cluttered; Payweek answers one question fast — "what's my pay week looking like?" Every screen must justify its existence against that.
- Design: dark/void background, one accent color, generous spacing, no clutter. Display font: Syne; data/numbers: JetBrains Mono. Big legible numbers — this is used one-handed in a warehouse car park.

## Stack (fixed — do not substitute)

- Vite + React 18 + TypeScript (strict) + Tailwind
- Capacitor 6, Android target
- Supabase: auth (email magic link + Google), Postgres, RLS on every table
- TanStack Query for data/caching; offline-tolerant shift entry (queue writes, sync on reconnect)
- date-fns for dates. **All money as integer pence. No floats, ever.**

## Working rules for you (Claude Code)

1. Work strictly phase by phase (below). Finish a phase, show me the done-criteria passing, wait for my go before the next.
2. Small commits with clear messages after each working step.
3. Run `tsc --noEmit` and the test suite before declaring anything done.
4. The rate engine (Section: Rate Engine) is pure TypeScript with unit tests — build and test it **before** any UI uses it.
5. Ask me only when a product decision is genuinely ambiguous; otherwise pick the simpler option and note the assumption.

---

## RATE ENGINE (core requirement — flexible per-hour rates)

Agency workers get different rates for different hours. The engine must support all of these **per agency**, combinable:

1. **Base rate** — fallback rate for any minute not matched by a rule.
2. **Time-band rules** — a rate for specific clock hours on specific days.
   Examples: Mon–Fri 22:00–06:00 = £14.50 (night rate); Sat–Sun all day = £15.00; Fri 18:00–24:00 = base × 1.25.
3. **Threshold rules** — a different rate after N hours.
   Examples: after 8h in a shift → ×1.5 (daily OT); after 40h in a pay week → ×1.5 (weekly OT).
4. **Per-shift manual override** — a fixed rate entered on the shift that bypasses all rules. This is the escape hatch for one-off deals.

### Data model for rules

```sql
rate_rules (
  id uuid pk,
  agency_id uuid references agencies,
  kind text check (kind in ('time_band','threshold')),
  label text,                        -- "Night rate", "Weekend", "Daily OT"
  -- time_band fields:
  days_of_week int[] null,           -- 0=Sun..6=Sat; null = all days
  band_start time null,              -- band may cross midnight (22:00–06:00)
  band_end time null,
  -- threshold fields:
  threshold_minutes int null,        -- e.g. 480 = after 8h
  threshold_scope text null check (threshold_scope in ('shift','pay_week')),
  -- pay (exactly one of):
  rate_pence int null,               -- fixed rate
  multiplier numeric null,           -- × the rate otherwise applicable
  priority int not null default 0,   -- higher wins on overlap
  active bool not null default true
)
```

### Resolution algorithm (implement as pure functions in `src/lib/rateEngine/`)

1. Split the shift into **minute segments** (handle shifts crossing midnight — a Tue 22:00–06:00 shift has Tue and Wed minutes).
2. Deduct break minutes (from the end of the shift by default, or let user mark break time — v1: deduct from total, apportioned pro-rata across segments).
3. For each minute: find matching `time_band` rules (day + time, midnight-wrapping bands supported). Highest `priority` wins; ties → highest resulting rate. No match → base rate.
4. Apply `threshold` rules on top: once cumulative paid minutes (per shift or per pay week) pass `threshold_minutes`, subsequent minutes use the threshold rule's fixed rate, or multiplier × that minute's already-resolved rate.
5. If the shift has a manual override rate: every minute = override, skip 3–4.
6. Sum to gross pence per shift; also return a **breakdown** (list of {label, minutes, rate_pence, subtotal_pence}) — the UI shows this so users trust the number.

### Required unit tests (write these first, they define correctness)

- Plain shift, base rate only
- Shift crossing midnight into a night band (22:00–06:00)
- Weekend band overlapping a night band (priority resolution)
- Daily OT: 10h shift with 8h threshold ×1.5
- Weekly OT: threshold crossed mid-shift on the 5th shift of the week
- Multiplier stacking: night band minute pushed past OT threshold (multiplier applies to the night rate, not base)
- Manual override ignores everything
- Break deduction pro-rata across two bands

---

## Full data model

```
profiles      — id (= auth.uid), display_name, currency 'GBP',
                week_starts_on int, holiday_accrual_pct numeric default 12.07
agencies      — id, user_id, name, base_rate_pence, pay_cycle
                (weekly|fortnightly|monthly), pay_week_start_day int,
                pay_delay_days int, notes, archived bool
rate_rules    — (see above)
shifts        — id, user_id, agency_id, date, start_time, end_time,
                break_minutes, manual_rate_pence null, notes
payslips      — id, user_id, agency_id, period_start, period_end,
                gross_pence, net_pence null
```

RLS: every table `user_id = auth.uid()` (rate_rules via agency ownership).

## Screens

1. **Quick Add (home)** — repeat-last-shift button; add shift in <10s: agency → date → times → break. Works offline.
2. **Shifts** — grouped by pay week with weekly totals (hours + expected gross); tap a shift → rate breakdown from the engine.
3. **Payday** — per agency: "Week ending X: 42.5h, expected £512.30 gross, paid Fri 2 Aug." Holiday accrual (12.07%) shown as a separate line, toggleable in settings.
4. **Payslip check** — pick agency + period, enter payslip gross → match ✓ or "£38.40 short" with per-shift comparison.
5. **Agency & Rates settings** — CRUD for agencies and rate rules. Rule builder UI: "From [22:00] to [06:00] on [Mon–Fri] pay [£14.50 | ×1.25]". Live preview: sample 12h shift priced under current rules.
6. **Settings** — profile, week start, holiday %, CSV export, sign out.

## Phases

**Phase 1 — Scaffold.** Vite+React+TS+Tailwind+Capacitor project, Supabase schema + RLS migrations, auth flow. *Done:* sign in/out works in browser and on an Android device/emulator.

**Phase 2 — Rate engine.** Pure TS engine + full unit test suite above. No UI. *Done:* all tests green.

**Phase 3 — Core loop.** Agencies CRUD, rate-rule builder with live preview, shift add/edit/delete, shift list with breakdowns. *Done:* I can recreate my real agency's rules and a logged shift shows the correct gross.

**Phase 4 — Pay views.** Pay-week grouping, Payday screen, holiday accrual, payslip check, CSV export. *Done:* seeded discrepancy is flagged correctly; weekly totals match a hand-built spreadsheet.

**Phase 5 — Offline + polish.** Offline write queue, empty/loading/error states, app icon, splash.

**Phase 6 — Release.** Signed AAB, Play Console closed-testing setup notes, privacy policy page, data safety answers.

## Do NOT build (v1)

Net-pay/tax estimation, payslip OCR, push notifications, shift sharing, iOS, widgets.

---

Start with Phase 1. Show me the schema migration before applying it.

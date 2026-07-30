-- Itemised breaks so unpaid time comes out of the rate band it actually
-- falls in. Deducting a break pro-rata across the whole shift misprices it
-- whenever the bands pay differently: a 30-minute break at 21:00 on a shift
-- paying £13 until 22:00 and £15 after should cost £13, not a blend.
--
-- break_minutes stays as the total (kept in sync by the app) so anything
-- reading only that column still sees the right amount of unpaid time.
-- An empty array preserves the old pro-rata behaviour for existing rows.

alter table public.shifts
  add column breaks jsonb not null default '[]'::jsonb;

comment on column public.shifts.breaks is
  'Array of {start_time: "HH:MM"|null, minutes: int}. start_time null = deducted pro-rata. Empty array = fall back to break_minutes, pro-rata.';

-- Element shape is enforced in the app (src/lib/rateEngine/adapters.ts
-- sanitises on read); a check constraint cannot iterate an array without a
-- subquery, so guard the gross error here.
alter table public.shifts
  add constraint shifts_breaks_is_array
  check (jsonb_typeof(breaks) = 'array');

-- Take-home estimates.
--
-- The single most-asked-for thing from the closed test: testers want to know
-- what lands in the bank, not what the shifts were worth. That needs their
-- PAYE tax code, which is on every payslip and is the only input the
-- calculation cannot work out for itself.
--
-- A tax code is not a secret and not a tax identifier — it encodes an
-- allowance and a set of rates, nothing that identifies a person. It sits on
-- profiles beside the other per-person preferences, under the same row-level
-- security as the rest of the row.
--
-- The format check is deliberately loose where the parser in
-- src/lib/tax/taxCode.ts is strict: the database's job is to refuse rubbish,
-- the app's job is to refuse a code it cannot read. A constraint that
-- enshrined the exact grammar would have to be migrated every time HMRC
-- invented a letter.

alter table public.profiles
  add column if not exists tax_code text
    check (tax_code is null or tax_code ~ '^[A-Z0-9]{2,10}$'),
  add column if not exists show_take_home bool not null default true;

comment on column public.profiles.tax_code is
  'PAYE tax code, upper-cased, no spaces, e.g. 1257L, S1257L, BR, K500. '
  'Null means the person has not given one and sees gross figures only.';

comment on column public.profiles.show_take_home is
  'Whether to show the after-tax estimate alongside gross pay.';

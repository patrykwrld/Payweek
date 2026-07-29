-- Payweek initial schema
-- All money is integer pence. All tables have RLS.

-- ============================================================
-- profiles (1:1 with auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency text not null default 'GBP',
  week_starts_on int not null default 1
    check (week_starts_on between 0 and 6),          -- 0=Sun..6=Sat
  holiday_accrual_pct numeric not null default 12.07
    check (holiday_accrual_pct >= 0),
  show_holiday_accrual bool not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: own row" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Auto-create a profile when a user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- agencies
-- ============================================================
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  base_rate_pence int not null check (base_rate_pence >= 0),
  pay_cycle text not null default 'weekly'
    check (pay_cycle in ('weekly', 'fortnightly', 'monthly')),
  pay_week_start_day int not null default 1
    check (pay_week_start_day between 0 and 6),      -- 0=Sun..6=Sat
  pay_delay_days int not null default 4
    check (pay_delay_days >= 0),                     -- days after week end until payday
  notes text,
  archived bool not null default false,
  created_at timestamptz not null default now()
);

create index agencies_user_idx on public.agencies (user_id);

alter table public.agencies enable row level security;

create policy "agencies: own rows" on public.agencies
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- rate_rules (owned via agency)
-- ============================================================
create table public.rate_rules (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  kind text not null check (kind in ('time_band', 'threshold')),
  label text not null check (length(trim(label)) > 0),
  -- time_band fields
  days_of_week int[] null,                           -- 0=Sun..6=Sat; null = all days
  band_start time null,                              -- band may cross midnight (22:00-06:00)
  band_end time null,
  -- threshold fields
  threshold_minutes int null check (threshold_minutes > 0),
  threshold_scope text null check (threshold_scope in ('shift', 'pay_week')),
  -- pay: exactly one of rate_pence / multiplier
  rate_pence int null check (rate_pence >= 0),
  multiplier numeric null check (multiplier > 0),
  priority int not null default 0,
  active bool not null default true,
  created_at timestamptz not null default now(),

  constraint rate_rules_one_pay_kind check (
    (rate_pence is not null)::int + (multiplier is not null)::int = 1
  ),
  constraint rate_rules_kind_fields check (
    case kind
      when 'time_band' then
        band_start is not null and band_end is not null
        and threshold_minutes is null and threshold_scope is null
      when 'threshold' then
        threshold_minutes is not null and threshold_scope is not null
        and days_of_week is null and band_start is null and band_end is null
    end
  ),
  constraint rate_rules_days_valid check (
    days_of_week is null
    or (array_length(days_of_week, 1) > 0
        and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6])
  )
);

create index rate_rules_agency_idx on public.rate_rules (agency_id);

alter table public.rate_rules enable row level security;

create policy "rate_rules: via agency ownership" on public.rate_rules
  for all to authenticated
  using (
    exists (
      select 1 from public.agencies a
      where a.id = rate_rules.agency_id and a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.agencies a
      where a.id = rate_rules.agency_id and a.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- shifts
-- ============================================================
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  date date not null,                                -- calendar day the shift starts
  start_time time not null,
  end_time time not null,                            -- end <= start means crosses midnight
  break_minutes int not null default 0 check (break_minutes >= 0),
  manual_rate_pence int null check (manual_rate_pence >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index shifts_user_date_idx on public.shifts (user_id, date);
create index shifts_agency_idx on public.shifts (agency_id);

alter table public.shifts enable row level security;

create policy "shifts: own rows" on public.shifts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- payslips
-- ============================================================
create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  gross_pence int not null check (gross_pence >= 0),
  net_pence int null check (net_pence >= 0),
  created_at timestamptz not null default now(),

  constraint payslips_period_valid check (period_end >= period_start)
);

create index payslips_user_idx on public.payslips (user_id, period_end);
create index payslips_agency_idx on public.payslips (agency_id);

alter table public.payslips enable row level security;

create policy "payslips: own rows" on public.payslips
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

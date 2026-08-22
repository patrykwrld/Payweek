-- Email addresses collected on the marketing page while Payweek is still in
-- closed testing. Deliberately separate from auth.users: these people have no
-- account, and most never will until launch day.
create table if not exists public.launch_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  created_at timestamptz not null default now()
);

-- Case-insensitive, so the same person signing up twice from two devices does
-- not turn into two launch emails.
create unique index if not exists launch_signups_email_lower_key
  on public.launch_signups (lower(email));

alter table public.launch_signups enable row level security;

-- Anyone may add themselves, and nobody at all may read the list back. This
-- asymmetry is the whole point: public/landing.html carries the publishable
-- key in its source, so the anon role must be able to do nothing except
-- insert. Without the missing select policy, that key would hand every visitor
-- the mailing list.
drop policy if exists "anyone may sign up" on public.launch_signups;
create policy "anyone may sign up"
  on public.launch_signups
  for insert
  to anon, authenticated
  with check (
    -- Cheap sanity check so obvious junk never reaches the table. The real
    -- validation is that a launch email either arrives or bounces.
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and length(email) <= 254
    and (source is null or length(source) <= 64)
  );

comment on table public.launch_signups is
  'Pre-launch mailing list from the marketing page. Insert-only for anon; read it with the service role or the SQL editor.';

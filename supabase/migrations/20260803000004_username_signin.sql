-- Usernames, so people can sign back in without their email address.
--
-- Supabase authenticates on email, so the username is a handle that resolves
-- to one. It lives here rather than in auth.users because it needs a unique
-- index and a format check, and because the app already reads this table.

alter table public.profiles
  add column if not exists username text;

-- Case-insensitively unique. Someone typing "Sam" must not land on "sam"'s
-- account, and must not be able to register a second one either.
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username))
  where username is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_format'
  ) then
    alter table public.profiles
      add constraint profiles_username_format
      check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$');
  end if;
end $$;

comment on column public.profiles.username is
  'Sign-in handle. Case-insensitively unique; resolved to an email by the username-signin Edge Function. Null for accounts created before usernames existed, and for magic-link/Google sign-ups that never set one.';

-- Carry the username through from sign-up. `signUp` puts it in user_metadata,
-- which is the only channel available before the profile row exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  wanted text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    wanted
  );
  return new;
exception
  -- A username taken between the availability check and the insert must not
  -- destroy the sign-up: the account is already created in auth.users at this
  -- point, and raising here would leave someone with a login and no profile.
  -- They keep the account and can set a username in Settings.
  when unique_violation then
    insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
    on conflict (id) do nothing;
    return new;
end;
$function$;

-- Whether a username can be claimed.
--
-- SECURITY DEFINER and callable by `anon` on purpose, and the database linter
-- will flag both: a sign-up form has to answer "is this taken?" before there
-- is any session to check it with. It returns a boolean and nothing else, so
-- the most it discloses is whether a handle is in use — which is inherent to
-- having usernames at all. Email addresses stay unreachable: turning one into
-- the other needs the service role and happens only inside the
-- username-signin Edge Function.
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path to ''
stable
as $$
  select not exists (
    select 1
    from public.profiles
    where lower(username) = lower(trim(p_username))
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

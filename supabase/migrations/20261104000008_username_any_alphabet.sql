-- Let people use their own name.
--
-- The old constraint was '^[A-Za-z0-9_]{3,20}$'. Agency work in the UK is
-- done in large part by Polish, Romanian, Lithuanian and Bulgarian speakers,
-- and that rule refused Paweł, Mihăiță and Šarūnas while the app told them
-- "letters, numbers and underscores only" — refusing a letter and calling it
-- not a letter. Sign-ups stopped and nobody reported it, because the message
-- read like the app's final word rather than a bug.
--
-- The new shape, matching USERNAME_PATTERN in src/lib/credentials.ts and the
-- check in the username-signin Edge Function:
--
--   starts and ends with a letter or a digit, any alphabet
--   may contain _ . - and combining accents in between
--   3 to 20 characters
--
-- Anchoring both ends on alnum is what keeps the dangerous characters out.
-- A zero-width joiner or a right-to-left override is neither a letter nor a
-- digit, so a handle cannot be made to display as something it is not —
-- verified against this database before the constraint was written.
--
-- [[:alnum:]] is Unicode-aware here: this database is UTF-8, and the forms
-- above were tested against it directly rather than assumed.

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (
    username is null
    or username ~ '^[[:alnum:]][[:alnum:]_.-]{1,18}[[:alnum:]]$'
  );

-- Every username already stored passes the new rule: it is strictly wider
-- than the old one for the middle, and no existing handle can start or end
-- with a separator because the old rule had none in it except underscore...
-- which it did allow at the ends. So this is checked rather than assumed.
do $$
declare
  offenders int;
begin
  select count(*) into offenders
  from public.profiles
  where username is not null
    and username !~ '^[[:alnum:]][[:alnum:]_.-]{1,18}[[:alnum:]]$';
  if offenders > 0 then
    raise exception
      'Refusing to narrow the rule: % existing username(s) would become invalid', offenders;
  end if;
end $$;

comment on constraint profiles_username_format on public.profiles is
  'Letters from any alphabet, digits, and _ . - in the middle. 3-20 chars. '
  'Kept identical to USERNAME_PATTERN in src/lib/credentials.ts and the '
  'username-signin Edge Function; if one moves, all three have to.';

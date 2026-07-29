-- handle_new_user is only ever invoked by the auth.users trigger;
-- it must not be callable through the PostgREST RPC endpoint.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- SECURITY DEFINER functions are callable through the Data API unless EXECUTE is revoked.
-- handle_new_user only runs from the auth.users trigger; is_admin is used by RLS policies
-- and only needs to be callable by signed-in users.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

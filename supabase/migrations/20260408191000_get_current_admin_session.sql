create or replace function cms.get_current_admin_session()
returns table (
  profile_id uuid,
  auth_user_id uuid,
  display_name text,
  status cms.admin_profile_status,
  default_locale text,
  roles text[]
)
language sql
stable
security definer
set search_path = public, cms
as $$
  select
    ap.id as profile_id,
    ap.auth_user_id,
    ap.display_name,
    ap.status,
    ap.default_locale,
    coalesce(array_remove(array_agg(distinct r.code), null), '{}'::text[]) as roles
  from cms.admin_profiles ap
  left join cms.user_role_assignments ura on ura.profile_id = ap.id
  left join cms.roles r on r.id = ura.role_id
  where ap.auth_user_id = auth.uid()
  group by ap.id, ap.auth_user_id, ap.display_name, ap.status, ap.default_locale
$$;

grant execute on function cms.get_current_admin_session() to authenticated, service_role;

notify pgrst, 'reload schema';

-- Ensure hosted PostgREST exposes the custom CMS schemas that this platform uses.
-- This keeps staging and production aligned with local `supabase/config.toml`.
alter role authenticator
set pgrst.db_schemas = 'public,storage,graphql_public,cms,ops';

alter role authenticator
set pgrst.db_extra_search_path = 'public,extensions,cms,ops';

grant usage on schema cms to anon, authenticated, service_role;
grant usage on schema ops to anon, authenticated, service_role;

grant all on all tables in schema cms to anon, authenticated, service_role;
grant all on all routines in schema cms to anon, authenticated, service_role;
grant all on all sequences in schema cms to anon, authenticated, service_role;

grant all on all tables in schema ops to anon, authenticated, service_role;
grant all on all routines in schema ops to anon, authenticated, service_role;
grant all on all sequences in schema ops to anon, authenticated, service_role;

alter default privileges in schema cms
grant all on tables to anon, authenticated, service_role;
alter default privileges in schema cms
grant all on routines to anon, authenticated, service_role;
alter default privileges in schema cms
grant all on sequences to anon, authenticated, service_role;

alter default privileges in schema ops
grant all on tables to anon, authenticated, service_role;
alter default privileges in schema ops
grant all on routines to anon, authenticated, service_role;
alter default privileges in schema ops
grant all on sequences to anon, authenticated, service_role;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

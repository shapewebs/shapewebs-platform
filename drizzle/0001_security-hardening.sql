-- Application roles are created outside migrations by the provider bootstrap.
-- This migration owns object-level permissions so every schema change remains
-- reviewable and repeatable.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth, app, audit FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth, app, audit FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA auth, app, audit FROM PUBLIC;
REVOKE USAGE ON TYPE
  app.membership_role,
  app.membership_status,
  app.project_status,
  app.content_kind,
  app.content_status,
  app.lead_kind,
  app.lead_status
  FROM PUBLIC;
REVOKE ALL PRIVILEGES ON SCHEMA auth, app, audit FROM PUBLIC;

GRANT USAGE ON SCHEMA auth TO shapewebs_admin_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA auth
  TO shapewebs_admin_runtime;

GRANT USAGE ON SCHEMA app TO
  shapewebs_admin_runtime,
  shapewebs_web_runtime,
  shapewebs_public_reader;
GRANT USAGE ON TYPE
  app.membership_role,
  app.membership_status,
  app.project_status,
  app.content_kind,
  app.content_status,
  app.lead_kind,
  app.lead_status
  TO
  shapewebs_admin_runtime,
  shapewebs_web_runtime,
  shapewebs_public_reader;

GRANT SELECT, UPDATE
  ON app.organizations
  TO shapewebs_admin_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON app.memberships,
     app.projects,
     app.project_memberships,
     app.project_updates,
     app.content_documents
  TO shapewebs_admin_runtime;
GRANT SELECT, INSERT
  ON app.content_revisions
  TO shapewebs_admin_runtime;
GRANT SELECT, UPDATE
  ON app.lead_submissions
  TO shapewebs_admin_runtime;
GRANT SELECT, INSERT, DELETE
  ON app.files
  TO shapewebs_admin_runtime;

GRANT SELECT
  ON app.content_documents,
     app.content_revisions
  TO shapewebs_web_runtime,
     shapewebs_public_reader;
GRANT INSERT
  ON app.lead_submissions
  TO shapewebs_web_runtime;

GRANT EXECUTE
  ON FUNCTION app.project_belongs_to_current_organization(uuid),
              app.current_user_has_project_access(uuid)
  TO shapewebs_admin_runtime;

GRANT USAGE ON SCHEMA audit TO shapewebs_admin_runtime;
GRANT SELECT, INSERT
  ON audit.events
  TO shapewebs_admin_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA auth
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA app
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA audit
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA auth
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA app
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA audit
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA auth
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA app
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA audit
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA auth
  REVOKE USAGE ON TYPES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA app
  REVOKE USAGE ON TYPES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA audit
  REVOKE USAGE ON TYPES FROM PUBLIC;

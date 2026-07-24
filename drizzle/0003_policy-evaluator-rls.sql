CREATE POLICY "migrator reads project assignments for policy evaluation" ON "app"."project_memberships" AS PERMISSIVE FOR SELECT TO "shapewebs_migrator" USING (true);--> statement-breakpoint
CREATE POLICY "migrator reads projects for policy evaluation" ON "app"."projects" AS PERMISSIVE FOR SELECT TO "shapewebs_migrator" USING (true);--> statement-breakpoint
ALTER FUNCTION app.project_belongs_to_current_organization(uuid)
  SET row_security = on;--> statement-breakpoint
ALTER FUNCTION app.current_user_has_project_access(uuid)
  SET row_security = on;

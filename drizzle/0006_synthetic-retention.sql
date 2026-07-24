CREATE POLICY "owners delete expired synthetic leads" ON "app"."lead_submissions" AS PERMISSIVE FOR DELETE TO "shapewebs_admin_runtime" USING ("app"."lead_submissions"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and nullif(current_setting('app.membership_role', true), '') = 'owner'
        and "app"."lead_submissions"."kind" = 'contact'
        and "app"."lead_submissions"."name" = 'Checkly Synthetic Monitor'
        and lower("app"."lead_submissions"."email") = 'synthetic-monitor@shapewebs.invalid'
        and "app"."lead_submissions"."message" = 'Synthetic staging reliability check. Safe to delete.'
        and "app"."lead_submissions"."payload"->>'company' = 'CHECKLY_SYNTHETIC_DO_NOT_CONTACT'
        and "app"."lead_submissions"."created_at" < now() - interval '6 days');--> statement-breakpoint
GRANT DELETE
  ON app.lead_submissions
  TO shapewebs_admin_runtime;

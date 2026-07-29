ALTER POLICY "web runtime reads exact preview grant" ON "app"."content_preview_grants" TO shapewebs_web_runtime USING ("app"."content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_preview_grants"."expires_at" > now()
        and (
          (
            "app"."content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
            and "app"."content_preview_grants"."created_at" > now() - interval '5 minutes'
            and (
              "app"."content_preview_grants"."consumed_at" is null
              or (
                "app"."content_preview_grants"."consumed_at" is not null
                and "app"."content_preview_grants"."session_token_hash" = nullif(current_setting('app.preview_session_token_hash', true), '')
              )
            )
          )
          or (
            "app"."content_preview_grants"."session_token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
            and "app"."content_preview_grants"."consumed_at" is not null
          )
        ));--> statement-breakpoint
ALTER POLICY "web runtime consumes fresh preview grant" ON "app"."content_preview_grants" TO shapewebs_web_runtime USING ("app"."content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
        and "app"."content_preview_grants"."consumed_at" is null
        and "app"."content_preview_grants"."expires_at" > now()
        and "app"."content_preview_grants"."created_at" > now() - interval '5 minutes') WITH CHECK ("app"."content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
        and "app"."content_preview_grants"."consumed_at" is not null
        and "app"."content_preview_grants"."session_token_hash" = nullif(current_setting('app.preview_session_token_hash', true), '')
        and "app"."content_preview_grants"."expires_at" > now());--> statement-breakpoint
ALTER POLICY "web runtime reads exact Sanity preview grant" ON "app"."sanity_content_preview_grants" TO shapewebs_web_runtime USING ("app"."sanity_content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."sanity_content_preview_grants"."expires_at" > now()
        and (
          (
            "app"."sanity_content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
            and "app"."sanity_content_preview_grants"."created_at" > now() - interval '5 minutes'
            and (
              "app"."sanity_content_preview_grants"."consumed_at" is null
              or (
                "app"."sanity_content_preview_grants"."consumed_at" is not null
                and "app"."sanity_content_preview_grants"."session_token_hash" = nullif(current_setting('app.preview_session_token_hash', true), '')
              )
            )
          )
          or (
            "app"."sanity_content_preview_grants"."session_token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
            and "app"."sanity_content_preview_grants"."consumed_at" is not null
          )
        ));--> statement-breakpoint
ALTER POLICY "web runtime consumes fresh Sanity preview grant" ON "app"."sanity_content_preview_grants" TO shapewebs_web_runtime USING ("app"."sanity_content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."sanity_content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
        and "app"."sanity_content_preview_grants"."consumed_at" is null
        and "app"."sanity_content_preview_grants"."expires_at" > now()
        and "app"."sanity_content_preview_grants"."created_at" > now() - interval '5 minutes') WITH CHECK ("app"."sanity_content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."sanity_content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
        and "app"."sanity_content_preview_grants"."consumed_at" is not null
        and "app"."sanity_content_preview_grants"."session_token_hash" = nullif(current_setting('app.preview_session_token_hash', true), '')
        and "app"."sanity_content_preview_grants"."expires_at" > now());
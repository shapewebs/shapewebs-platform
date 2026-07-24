ALTER TYPE "app"."content_kind" ADD VALUE 'method' BEFORE 'legal';--> statement-breakpoint
ALTER TYPE "app"."content_status" ADD VALUE 'review' BEFORE 'published';--> statement-breakpoint
ALTER TYPE "app"."content_status" ADD VALUE 'scheduled' BEFORE 'published';

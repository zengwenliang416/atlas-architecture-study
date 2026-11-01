ALTER TABLE "study_record" ADD COLUMN "attempt" text;--> statement-breakpoint
ALTER TABLE "study_record" ADD COLUMN "essay_draft" text DEFAULT '' NOT NULL;

CREATE TABLE "attempt_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"bank_id" text NOT NULL,
	"question_id" text NOT NULL,
	"blank_index" integer NOT NULL,
	"choice" text,
	"verdict" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"bank_id" text NOT NULL,
	"question_id" text NOT NULL,
	"note_0" text DEFAULT '' NOT NULL,
	"note_1" text DEFAULT '' NOT NULL,
	"note_2" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempt_log" ADD CONSTRAINT "attempt_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_history" ADD CONSTRAINT "note_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempt_log_question" ON "attempt_log" USING btree ("user_id","bank_id","question_id");--> statement-breakpoint
CREATE INDEX "note_history_question" ON "note_history" USING btree ("user_id","bank_id","question_id","created_at");

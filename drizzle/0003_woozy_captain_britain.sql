CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "metric_snapshots_session_id_idx" ON "metric_snapshots" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "questions_session_id_idx" ON "questions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_created_at_idx" ON "sessions" USING btree ("user_id","created_at");
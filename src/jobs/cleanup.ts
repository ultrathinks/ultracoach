import { eq, lt, sql } from "drizzle-orm";
import { db } from "../shared/db";
import { errorLogs, jobRuns, webhookEvents } from "../shared/db/schema";
import { JOB_LOCK_IDS, withJobLock } from "../shared/lib/job-lock";

const RETENTION_DAYS = {
  webhook: 90,
  jobRuns: 30,
  errorLogs: 60,
} as const;

export async function cleanupJob() {
  return withJobLock(JOB_LOCK_IDS.CLEANUP, async () => {
    const runId = crypto.randomUUID();
    const startedAt = new Date();
    await db.insert(jobRuns).values({
      id: runId,
      jobName: "cleanup",
      status: "running",
      startedAt,
    });

    const webhookCutoff = new Date(
      Date.now() - RETENTION_DAYS.webhook * 24 * 60 * 60 * 1000,
    );
    const jobsCutoff = new Date(
      Date.now() - RETENTION_DAYS.jobRuns * 24 * 60 * 60 * 1000,
    );
    const errorsCutoff = new Date(
      Date.now() - RETENTION_DAYS.errorLogs * 24 * 60 * 60 * 1000,
    );

    try {
      await db
        .delete(webhookEvents)
        .where(lt(webhookEvents.receivedAt, webhookCutoff));
      await db
        .delete(jobRuns)
        .where(
          sql`${jobRuns.startedAt} < ${jobsCutoff} AND ${jobRuns.jobName} <> 'cleanup'`,
        );
      await db.delete(errorLogs).where(lt(errorLogs.createdAt, errorsCutoff));

      const finishedAt = new Date();
      await db
        .update(jobRuns)
        .set({
          status: "success",
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
        })
        .where(eq(jobRuns.id, runId));
    } catch (err) {
      await db
        .update(jobRuns)
        .set({
          status: "failed",
          finishedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : "unknown",
        })
        .where(eq(jobRuns.id, runId));
    }
  });
}

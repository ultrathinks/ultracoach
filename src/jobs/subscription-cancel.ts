import { and, eq, lte } from "drizzle-orm";
import { db } from "../shared/db";
import { jobRuns, subscriptions } from "../shared/db/schema";
import { JOB_LOCK_IDS, withJobLock } from "../shared/lib/job-lock";
import { logError } from "../shared/lib/log-error";
import { recomputePlan } from "../shared/lib/plan";

export async function subscriptionCancelJob() {
  return withJobLock(JOB_LOCK_IDS.SUBSCRIPTION_CANCEL, async () => {
    const runId = crypto.randomUUID();
    const startedAt = new Date();
    let processedCount = 0;
    await db.insert(jobRuns).values({
      id: runId,
      jobName: "subscription-cancel",
      status: "running",
      startedAt,
    });

    try {
      const targets = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.cancelAtPeriodEnd, true),
            eq(subscriptions.status, "active"),
            lte(subscriptions.currentPeriodEnd, new Date()),
          ),
        );

      for (const sub of targets) {
        await db
          .update(subscriptions)
          .set({
            status: "canceled",
            canceledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));
        await recomputePlan(sub.userId);
        processedCount++;
      }

      const finishedAt = new Date();
      await db
        .update(jobRuns)
        .set({
          status: "success",
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          processedCount,
        })
        .where(eq(jobRuns.id, runId));
    } catch (err) {
      await logError(err, {
        source: "worker",
        context: { job: "subscription-cancel" },
      });
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

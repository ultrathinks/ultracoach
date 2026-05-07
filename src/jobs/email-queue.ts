import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { renderTemplate } from "../emails/templates";
import { db } from "../shared/db";
import { emailJobs } from "../shared/db/schema";
import { sendRawEmail } from "../shared/lib/email";
import { JOB_LOCK_IDS, withJobLock } from "../shared/lib/job-lock";

const BATCH_SIZE = 10;

export async function emailQueueJob() {
  return withJobLock(JOB_LOCK_IDS.EMAIL_QUEUE, async () => {
    const jobs = await db
      .select()
      .from(emailJobs)
      .where(
        and(
          or(
            eq(emailJobs.status, "pending"),
            and(
              eq(emailJobs.status, "failed"),
              or(
                isNull(emailJobs.retryAfter),
                lte(emailJobs.retryAfter, new Date()),
              ),
            ),
          ),
          sql`${emailJobs.attempts} < ${emailJobs.maxAttempts}`,
        ),
      )
      .orderBy(asc(emailJobs.priority), asc(emailJobs.createdAt))
      .limit(BATCH_SIZE);

    for (const job of jobs) {
      const claimed = await db
        .update(emailJobs)
        .set({ status: "processing", updatedAt: new Date() })
        .where(and(eq(emailJobs.id, job.id), eq(emailJobs.status, job.status)))
        .returning({ id: emailJobs.id });

      if (claimed.length === 0) continue;

      try {
        const locale = job.locale === "en" ? "en" : "ko";
        const rendered = renderTemplate(job.template, job.payload, locale);
        await sendRawEmail({
          to: job.to,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
        await db
          .update(emailJobs)
          .set({
            status: "sent",
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(emailJobs.id, job.id));
      } catch (err) {
        const attempts = job.attempts + 1;
        const message = err instanceof Error ? err.message : "unknown";
        const exhausted = attempts >= job.maxAttempts;
        const backoffMinutes = 3 ** attempts * 5;
        const retryAfter = new Date(Date.now() + backoffMinutes * 60_000);
        await db
          .update(emailJobs)
          .set({
            status: exhausted ? "failed" : "pending",
            attempts,
            lastError: message,
            retryAfter: exhausted ? null : retryAfter,
            updatedAt: new Date(),
          })
          .where(eq(emailJobs.id, job.id));
      }
    }
  });
}

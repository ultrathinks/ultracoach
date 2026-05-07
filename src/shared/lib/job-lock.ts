import { sql } from "drizzle-orm";
import { db } from "../db";

export const JOB_LOCK_IDS = {
  BILLING_RENEWAL: 1001,
  EMAIL_QUEUE: 1002,
  USAGE_RESET: 1003,
  SUBSCRIPTION_CANCEL: 1004,
  CLEANUP: 1005,
} as const;

export async function tryAcquireJobLock(lockId: number): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT pg_try_advisory_lock(${lockId}) AS acquired`,
  );
  const row = result[0];
  if (!row || typeof row !== "object" || !("acquired" in row)) return false;
  return row.acquired === true;
}

export async function releaseJobLock(lockId: number): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
}

export async function withJobLock<T>(
  lockId: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const acquired = await tryAcquireJobLock(lockId);
  if (!acquired) {
    console.log(`[job-lock] ${lockId} is busy, skipping`);
    return null;
  }
  try {
    return await fn();
  } finally {
    await releaseJobLock(lockId);
  }
}

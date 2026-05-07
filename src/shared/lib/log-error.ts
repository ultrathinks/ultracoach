import { db } from "../db";
import { errorLogs } from "../db/schema";

export type ErrorSource = "client" | "server" | "worker";

interface LogErrorOptions {
  source?: ErrorSource;
  userId?: string | null;
  context?: Record<string, unknown>;
}

export async function logError(error: unknown, options?: LogErrorOptions) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;
  try {
    await db.insert(errorLogs).values({
      userId: options?.userId ?? null,
      source: options?.source ?? "server",
      message,
      stack,
      context: options?.context ?? null,
    });
  } catch (err) {
    console.error("error log insert failed:", err);
  }
}

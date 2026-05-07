import { db } from "../db";
import { events } from "../db/schema";

export async function trackServer(
  name: string,
  props?: Record<string, unknown> | null,
  userId?: string | null,
) {
  try {
    await db.insert(events).values({
      userId: userId ?? null,
      name,
      props: props ?? null,
    });
  } catch (err) {
    console.warn("event track failed:", err);
  }
}

export function trackClient(name: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, props }),
  }).catch(() => {
    // 분석은 silently fail
  });
}

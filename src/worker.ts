import { sql } from "drizzle-orm";
import cron from "node-cron";
import { billingRenewalJob } from "./jobs/billing-renewal";
import { cleanupJob } from "./jobs/cleanup";
import { emailQueueJob } from "./jobs/email-queue";
import { subscriptionCancelJob } from "./jobs/subscription-cancel";
import { db } from "./shared/db";
import { sendDiscordAlert } from "./shared/lib/email";

async function main() {
  console.log("[worker] starting");

  await db.execute(sql`SELECT 1`);
  console.log("[worker] db ready");

  const tz = "Asia/Seoul";

  // 매일 KST 03:00 — 결제 갱신
  cron.schedule(
    "0 3 * * *",
    () => {
      void billingRenewalJob().catch(console.error);
    },
    { timezone: tz },
  );

  // 매일 KST 03:30 — 취소 예약된 구독 만료
  cron.schedule(
    "30 3 * * *",
    () => {
      void subscriptionCancelJob().catch(console.error);
    },
    { timezone: tz },
  );

  // 매 2분 — 이메일 큐
  cron.schedule("*/2 * * * *", () => {
    void emailQueueJob().catch(console.error);
  });

  // 매주 일요일 KST 04:00 — 오래된 데이터 정리
  cron.schedule(
    "0 4 * * 0",
    () => {
      void cleanupJob().catch(console.error);
    },
    { timezone: tz },
  );

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received`);
    await sendDiscordAlert(`worker shutdown: ${signal}`);
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  console.log("[worker] ready");
}

void main().catch((err) => {
  console.error("[worker] fatal:", err);
  void sendDiscordAlert(`worker fatal: ${err}`).finally(() => process.exit(1));
});

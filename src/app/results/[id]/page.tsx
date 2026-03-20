import { db } from "@/shared/db";
import { sessions, feedback } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { ResultsClient } from "./results-client";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold">세션을 찾을 수 없습니다</h1>
      </div>
    );
  }

  const [fb] = await db
    .select()
    .from(feedback)
    .where(eq(feedback.sessionId, id))
    .limit(1);

  return (
    <ResultsClient
      session={session}
      feedback={fb ?? null}
    />
  );
}

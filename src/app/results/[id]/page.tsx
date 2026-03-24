import { db } from "@/shared/db";
import { sessions, feedback } from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ResultsClient } from "./results-client";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authSession = await auth();
  if (!authSession?.user?.id) redirect("/");

  const { id } = await params;

  const [dbSession] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  if (!dbSession) notFound();
  if (dbSession.userId !== authSession.user.id) notFound();

  const [fb] = await db
    .select()
    .from(feedback)
    .where(eq(feedback.sessionId, id))
    .limit(1);

  return <ResultsClient session={dbSession} feedback={fb ?? null} />;
}

import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { questionAnalysisSchema } from "@/entities/feedback/schema";
import { db } from "@/shared/db";
import { feedback as feedbackTable, sessions } from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";
import { DrillScreen } from "@/widgets/drill/drill-screen";

export const dynamic = "force-dynamic";

export default async function DrillPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const authSession = await auth();
  if (!authSession?.user?.id) redirect("/");

  const { sessionId } = await params;
  const { q } = await searchParams;

  const [dbSession] = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      jobTitle: sessions.jobTitle,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!dbSession) notFound();
  if (dbSession.userId !== authSession.user.id) notFound();

  const [fb] = await db
    .select({ summaryJson: feedbackTable.summaryJson })
    .from(feedbackTable)
    .where(eq(feedbackTable.sessionId, sessionId))
    .limit(1);

  if (!fb?.summaryJson) notFound();

  const parsed = z
    .object({ questionAnalyses: z.array(questionAnalysisSchema) })
    .safeParse(fb.summaryJson);

  if (!parsed.success || parsed.data.questionAnalyses.length === 0) notFound();

  const analyses = parsed.data.questionAnalyses;

  const targetId = q ? Number(q) : analyses[0].questionId;
  const currentIndex = analyses.findIndex((qa) => qa.questionId === targetId);

  if (currentIndex === -1) notFound();

  const currentQa = analyses[currentIndex];

  const nextQuestionId =
    currentIndex < analyses.length - 1 ? analyses[currentIndex + 1].questionId : null;

  return (
    <DrillScreen
      sessionId={sessionId}
      questionId={currentQa.questionId}
      question={currentQa.questionText}
      suggestedAnswer={currentQa.suggestedAnswer ?? null}
      jobTitle={dbSession.jobTitle}
      nextQuestionId={nextQuestionId}
    />
  );
}

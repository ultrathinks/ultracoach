import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/shared/db";
import { sessions } from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";

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

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="text-6xl">&#x1F3AF;</div>
        <h1 className="text-2xl font-bold">드릴 모드 준비 중</h1>
        <p className="text-secondary leading-relaxed">
          {dbSession.jobTitle} 면접의 재연습 기능을 준비하고 있습니다.
          {q ? ` (질문 #${q})` : ""}
        </p>
        <p className="text-muted text-sm">
          곧 카메라와 마이크를 사용하여 답변을 연습할 수 있습니다
        </p>
        <Link
          href={`/results/${sessionId}`}
          className="inline-block px-6 py-3 rounded-lg text-sm font-medium border border-white/[0.06] hover:bg-card-hover transition-colors"
        >
          결과 화면으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

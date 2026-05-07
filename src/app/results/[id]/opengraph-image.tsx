import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/shared/db";
import { feedback as feedbackTable, sessions } from "@/shared/db/schema";

export const alt = "UltraCoach interview score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ResultsOgImage({
  params,
}: {
  params: { id: string };
}) {
  const [row] = await db
    .select({
      jobTitle: sessions.jobTitle,
      companyName: sessions.companyName,
      language: sessions.language,
      deliveryScore: sessions.deliveryScore,
      contentScore: sessions.contentScore,
    })
    .from(sessions)
    .leftJoin(feedbackTable, eq(feedbackTable.sessionId, sessions.id))
    .where(eq(sessions.id, params.id))
    .limit(1);

  const isEn = row?.language === "en";
  const totalScore = Math.round(
    ((row?.deliveryScore ?? 0) + (row?.contentScore ?? 0)) / 2,
  );
  const fallbackHeadline = isEn ? "AI Interview" : "AI 면접";
  const headline = row?.companyName
    ? `${row.companyName} · ${row?.jobTitle ?? fallbackHeadline}`
    : (row?.jobTitle ?? fallbackHeadline);
  const tagline = isEn
    ? "UltraCoach · AI Interview Coaching"
    : "UltraCoach · AI 면접 코칭";
  const scoreLabel = isEn ? "Total interview score" : "면접 종합 점수";
  const footer = isEn
    ? "coach.jmo.kr · AI-analyzed interview report"
    : "coach.jmo.kr · AI가 분석한 나의 면접 리포트";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#09090b",
        color: "#fafafa",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 28,
          color: "#a1a1aa",
        }}
      >
        {tagline}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 36, color: "#a78bfa" }}>{headline}</div>
        <div
          style={{
            fontSize: 220,
            fontWeight: 700,
            lineHeight: 1,
            background: "linear-gradient(135deg, #818cf8, #a78bfa, #f472b6)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
          }}
        >
          {totalScore}
        </div>
        <div style={{ fontSize: 32, color: "#71717a" }}>{scoreLabel}</div>
      </div>
      <div style={{ fontSize: 22, color: "#71717a" }}>{footer}</div>
    </div>,
    size,
  );
}

import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import { sessions } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { requireApiAuth } from "@/shared/lib/permissions";

const stateSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(["interviewer", "interviewee"]),
      content: z.string().max(5000),
    }),
  ),
  questions: z.array(
    z.object({
      id: z.number(),
      type: z.string(),
      text: z.string(),
      answer: z.string().nullable(),
      startTime: z.number(),
      endTime: z.number().nullable(),
    }),
  ),
  currentQuestion: z.string().nullable(),
  questionCount: z.number().int().min(0).max(50),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const instance = `/api/sessions/${id}/state`;
  const guard = await requireApiAuth(instance);
  if ("error" in guard) return guard.error;

  const body = stateSchema.safeParse(await request.json());
  if (!body.success) {
    return Problems.validation("invalid state body", instance);
  }

  const updated = await db
    .update(sessions)
    .set({ progressSnapshotJson: body.data, status: "in_progress" })
    .where(
      and(
        eq(sessions.id, id),
        eq(sessions.userId, guard.session.user.id),
        ne(sessions.status, "completed"),
      ),
    )
    .returning({ id: sessions.id });

  if (updated.length === 0) return Problems.notFound(instance);
  return new NextResponse(null, { status: 204 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const instance = `/api/sessions/${id}/state`;
  const guard = await requireApiAuth(instance);
  if ("error" in guard) return guard.error;

  const [row] = await db
    .select({
      id: sessions.id,
      status: sessions.status,
      progressSnapshotJson: sessions.progressSnapshotJson,
    })
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, guard.session.user.id)))
    .limit(1);

  if (!row) return Problems.notFound(instance);
  return NextResponse.json({
    sessionId: row.id,
    status: row.status,
    snapshot: row.progressSnapshotJson,
  });
}

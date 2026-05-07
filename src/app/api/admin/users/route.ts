import { desc, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import { sessions, users } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { requireApiAdmin } from "@/shared/lib/permissions";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  startingAfter: z.string().optional(),
});

export async function GET(request: Request) {
  const guard = await requireApiAdmin("/api/admin/users");
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    startingAfter: searchParams.get("starting_after") ?? undefined,
  });
  if (!parsed.success) {
    return Problems.validation("invalid query", "/api/admin/users");
  }
  const { limit, startingAfter } = parsed.data;

  let cursorCreatedAt: Date | null = null;
  if (startingAfter) {
    const cursor = await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(sql`${users.id} = ${startingAfter}`)
      .limit(1)
      .then((r) => r[0]);
    cursorCreatedAt = cursor?.createdAt ?? null;
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: users.role,
      plan: users.plan,
      createdAt: users.createdAt,
      sessionCount: sql<number>`(
        select count(*) from ${sessions}
        where ${sessions.userId} = ${users.id}
      )::int`,
    })
    .from(users)
    .where(cursorCreatedAt ? lt(users.createdAt, cursorCreatedAt) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  return NextResponse.json({
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1].id : null,
  });
}

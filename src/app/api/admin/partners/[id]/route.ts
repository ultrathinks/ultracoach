import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import { partners, users } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { requireApiAdmin } from "@/shared/lib/permissions";
import { recomputePlan } from "@/shared/lib/plan";

const patchSchema = z.object({
  labelKo: z.string().min(1).max(200).optional(),
  labelEn: z.string().min(1).max(200).optional(),
  plan: z.enum(["pro", "premium"]).optional(),
  active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

async function recomputeForPartner(partnerId: string) {
  const affected = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.partnerId, partnerId));
  for (const u of affected) {
    await recomputePlan(u.id);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const instance = `/api/admin/partners/${id}`;
  const guard = await requireApiAdmin(instance);
  if ("error" in guard) return guard.error;

  const body = patchSchema.safeParse(await request.json());
  if (!body.success) {
    return Problems.validation("invalid request body", instance);
  }
  const updates = body.data;
  if (Object.keys(updates).length === 0) {
    return Problems.validation("no fields to update", instance);
  }

  const [updated] = await db
    .update(partners)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(partners.id, id))
    .returning();
  if (!updated) return Problems.notFound(instance);

  // active 또는 plan 변경 시 영향 사용자 일괄 recompute
  if ("active" in updates || "plan" in updates) {
    await recomputeForPartner(id);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const instance = `/api/admin/partners/${id}`;
  const guard = await requireApiAdmin(instance);
  if ("error" in guard) return guard.error;

  // 영향 받는 사용자 ID 미리 수집
  const affected = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.partnerId, id));

  const deleted = await db
    .delete(partners)
    .where(eq(partners.id, id))
    .returning({ id: partners.id });
  if (deleted.length === 0) return Problems.notFound(instance);

  // FK가 set null이라 partnerId는 자동 해제됨. plan 재계산.
  for (const u of affected) {
    await recomputePlan(u.id);
  }

  return new NextResponse(null, { status: 204 });
}

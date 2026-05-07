import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { requireApiAdmin } from "@/shared/lib/permissions";
import { recomputePlan } from "@/shared/lib/plan";

const patchSchema = z.object({
  role: z.enum(["user", "admin", "demo"]).optional(),
  grantedPlan: z.enum(["free", "pro", "premium"]).nullable().optional(),
  name: z.string().min(1).max(100).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const instance = `/api/admin/users/${id}`;
  const guard = await requireApiAdmin(instance);
  if ("error" in guard) return guard.error;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Problems.validation("invalid request body", instance);
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return Problems.validation("no fields to update", instance);
  }

  const updated = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      grantedPlan: users.grantedPlan,
      plan: users.plan,
    });

  if (updated.length === 0) {
    return Problems.notFound(instance);
  }

  if ("grantedPlan" in updates) {
    await recomputePlan(id);
    const [refreshed] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        grantedPlan: users.grantedPlan,
        plan: users.plan,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return NextResponse.json(refreshed);
  }

  return NextResponse.json(updated[0]);
}

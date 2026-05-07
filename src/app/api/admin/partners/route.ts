import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import { partners } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { requireApiAdmin } from "@/shared/lib/permissions";

const DOMAIN_REGEX = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

const postSchema = z.object({
  domain: z.string().toLowerCase().regex(DOMAIN_REGEX).max(100),
  labelKo: z.string().min(1).max(200),
  labelEn: z.string().min(1).max(200),
  plan: z.enum(["pro", "premium"]).default("pro"),
  active: z.boolean().default(true),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET() {
  const guard = await requireApiAdmin("/api/admin/partners");
  if ("error" in guard) return guard.error;

  const data = await db
    .select()
    .from(partners)
    .orderBy(desc(partners.createdAt));

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const guard = await requireApiAdmin("/api/admin/partners");
  if ("error" in guard) return guard.error;

  const body = postSchema.safeParse(await request.json());
  if (!body.success) {
    return Problems.validation("invalid request body", "/api/admin/partners");
  }

  try {
    const [created] = await db.insert(partners).values(body.data).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message.includes("partners_domain_unique")) {
      return Problems.validation(
        "domain already registered",
        "/api/admin/partners",
      );
    }
    throw err;
  }
}

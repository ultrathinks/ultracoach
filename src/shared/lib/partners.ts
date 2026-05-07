import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { partners, users } from "../db/schema";
import { recomputePlan } from "./plan";

function extractDomain(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return domain && domain.length > 0 ? domain : null;
}

/**
 * 사용자 이메일 도메인을 partners 테이블과 매칭하고
 * users.partnerId를 동기화한 뒤 effective plan을 재계산.
 */
export async function syncPartnerAffiliation(
  userId: string,
  email: string,
): Promise<void> {
  const domain = extractDomain(email);

  const [user] = await db
    .select({ partnerId: users.partnerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return;

  const matched = domain
    ? await db
        .select({ id: partners.id })
        .from(partners)
        .where(and(eq(partners.domain, domain), eq(partners.active, true)))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  const matchedId = matched?.id ?? null;

  if (user.partnerId !== matchedId) {
    await db
      .update(users)
      .set({ partnerId: matchedId })
      .where(eq(users.id, userId));
    await recomputePlan(userId);
  }
}

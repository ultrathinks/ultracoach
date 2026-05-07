import { z } from "zod";
import { Problems } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { rateLimit } from "@/shared/lib/rate-limit";
import { trackServer } from "@/shared/lib/track";

const checkRate = rateLimit({ windowMs: 60_000, max: 60 });

const requestSchema = z.object({
  name: z.string().min(1).max(100),
  props: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (userId) {
    const limited = checkRate(userId, "events");
    if (limited) return limited;
  }

  const body = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return Problems.validation("invalid event payload", "/api/events");
  }

  await trackServer(body.data.name, body.data.props, userId);
  return new Response(null, { status: 204 });
}

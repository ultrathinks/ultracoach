import { z } from "zod";
import { Problems } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { logError } from "@/shared/lib/log-error";
import { rateLimit } from "@/shared/lib/rate-limit";

const checkRate = rateLimit({ windowMs: 60_000, max: 30 });

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(20000).optional(),
  context: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (userId) {
    const limited = checkRate(userId, "errors");
    if (limited) return limited;
  }

  const body = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return Problems.validation("invalid error payload", "/api/errors");
  }

  const { message, stack, context } = body.data;
  await logError(new Error(message), {
    source: "client",
    userId,
    context: { ...context, clientStack: stack },
  });
  return new Response(null, { status: 204 });
}

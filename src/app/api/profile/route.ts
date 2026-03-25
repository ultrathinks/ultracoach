import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : null;

  if (!name || name.length === 0) {
    return NextResponse.json({ error: "이름을 입력해주세요" }, { status: 400 });
  }

  if (name.length > 50) {
    return NextResponse.json(
      { error: "이름은 50자 이하로 입력해주세요" },
      { status: 400 },
    );
  }

  await db.update(users).set({ name }).where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}

import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/shared/db";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const poolMax = Number(process.env.DATABASE_POOL_MAX ?? 10);

const client = postgres(url, {
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(client, { schema });

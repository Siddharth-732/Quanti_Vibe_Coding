import { Pool } from "pg";

// One pool across dev hot reloads. Supabase requires SSL.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

// Creates tables + seed data: `npm run db:setup` (WARNING: drops existing tables)
import { readFileSync } from "node:fs";
import pg from "pg";

process.loadEnvFile(".env");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
const { rows } = await client.query("SELECT count(*) FROM tasks");
console.log(`Database ready (${rows[0].count} tasks seeded)`);
await client.end();

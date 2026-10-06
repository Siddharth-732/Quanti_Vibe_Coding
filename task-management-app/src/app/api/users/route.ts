import { query } from "@/lib/db";
import type { User } from "@/lib/types";

// GET /api/users — everyone (for the "add user to project" picker)
export async function GET() {
  return Response.json(await query<User>("SELECT id, name, email FROM users ORDER BY name"));
}

// POST /api/users  { name, email }
export async function POST(req: Request) {
  const { name, email } = await req.json();
  if (!name?.trim() || !email?.trim()) return Response.json({ error: "name and email are required" }, { status: 400 });
  try {
    const [user] = await query<User>(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email",
      [name.trim(), email.trim().toLowerCase()],
    );
    return Response.json(user, { status: 201 });
  } catch {
    return Response.json({ error: "email already exists" }, { status: 409 });
  }
}

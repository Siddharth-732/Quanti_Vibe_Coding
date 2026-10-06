import { query } from "@/lib/db";
import { ROLES, type Member } from "@/lib/types";

// GET /api/projects/:id/members — team list with each member's IN PROGRESS count (workload balancing)
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/members">) {
  const { id } = await ctx.params;
  const members = await query<Member>(
    `SELECT u.id, u.name, u.email, pm.role,
            COUNT(t.id) FILTER (WHERE t.status = 'in_progress')::int AS in_progress
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     LEFT JOIN tasks t ON t.assignee_id = u.id AND t.project_id = pm.project_id
     WHERE pm.project_id = $1
     GROUP BY u.id, pm.role
     ORDER BY u.name`,
    [id],
  );
  return Response.json(members);
}

// POST /api/projects/:id/members  { user_id, role? }
export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/members">) {
  const { id } = await ctx.params;
  const { user_id, role = "member" } = await req.json();
  if (!user_id) return Response.json({ error: "user_id is required" }, { status: 400 });
  if (!ROLES.includes(role)) return Response.json({ error: "invalid role" }, { status: 400 });

  await query(
    `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [id, user_id, role],
  );
  return Response.json({ ok: true }, { status: 201 });
}

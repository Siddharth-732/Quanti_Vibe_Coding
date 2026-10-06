import { query } from "@/lib/db";
import { PRIORITIES, STATUSES, type Task } from "@/lib/types";

const EDITABLE = ["title", "description", "status", "priority", "due_date", "assignee_id"] as const;

// PATCH /api/tasks/:id  — any subset of EDITABLE fields (used for drag-and-drop status moves too)
export async function PATCH(req: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const { id } = await ctx.params;
  const b = await req.json();
  if (b.status && !STATUSES.includes(b.status)) return Response.json({ error: "invalid status" }, { status: 400 });
  if (b.priority && !PRIORITIES.includes(b.priority)) return Response.json({ error: "invalid priority" }, { status: 400 });

  const fields = EDITABLE.filter((f) => f in b);
  if (fields.length === 0) return Response.json({ error: "nothing to update" }, { status: 400 });

  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const values = fields.map((f) => (b[f] === "" ? null : b[f]));
  const [task] = await query<Task>(
    `UPDATE tasks SET ${sets} WHERE id = $1
     RETURNING id, project_id, assignee_id, title, description, status, priority, to_char(due_date, 'YYYY-MM-DD') AS due_date`,
    [id, ...values],
  );
  if (!task) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(task);
}

// DELETE /api/tasks/:id
export async function DELETE(_req: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const { id } = await ctx.params;
  const rows = await query("DELETE FROM tasks WHERE id = $1 RETURNING id", [id]);
  if (rows.length === 0) return Response.json({ error: "not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}

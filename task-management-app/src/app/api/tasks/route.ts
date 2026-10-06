import { query } from "@/lib/db";
import { PRIORITIES, STATUSES, type Task } from "@/lib/types";

const COLS = "id, project_id, assignee_id, title, description, status, priority, to_char(due_date, 'YYYY-MM-DD') AS due_date";

// GET /api/tasks?projectId=1&priority=high
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const projectId = Number(params.get("projectId") ?? 1);
  const priority = params.get("priority");

  const tasks = await query<Task>(
    `SELECT ${COLS} FROM tasks
     WHERE project_id = $1 AND ($2::text IS NULL OR priority = $2)
     ORDER BY created_at`,
    [projectId, priority],
  );
  return Response.json(tasks);
}

// POST /api/tasks  { project_id, title, description?, status?, priority?, due_date?, assignee_id? }
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.title?.trim()) return Response.json({ error: "title is required" }, { status: 400 });
  if (b.status && !STATUSES.includes(b.status)) return Response.json({ error: "invalid status" }, { status: 400 });
  if (b.priority && !PRIORITIES.includes(b.priority)) return Response.json({ error: "invalid priority" }, { status: 400 });

  const [task] = await query<Task>(
    `INSERT INTO tasks (project_id, title, description, status, priority, due_date, assignee_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      b.project_id ?? 1,
      b.title.trim(),
      b.description || null,
      b.status ?? "todo",
      b.priority ?? "medium",
      b.due_date || null,
      b.assignee_id || null,
    ],
  );
  return Response.json(task, { status: 201 });
}

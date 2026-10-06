"use client";

import { useCallback, useEffect, useState } from "react";
import { PRIORITIES, STATUSES, type Member, type Priority, type Status, type Task, type User } from "@/lib/types";

const COLUMN_LABEL: Record<Status, string> = { todo: "To-Do", in_progress: "In Progress", done: "Done" };
const COLUMN_DOT: Record<Status, string> = { todo: "bg-sky-500", in_progress: "bg-amber-500", done: "bg-emerald-500" };
const COLUMN_STYLE: Record<Status, string> = {
  todo: "border-t-sky-400 bg-sky-50/70",
  in_progress: "border-t-amber-400 bg-amber-50/70",
  done: "border-t-emerald-400 bg-emerald-50/70",
};
const COUNT_STYLE: Record<Status, string> = {
  todo: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};
const CARD_STRIPE: Record<Priority, string> = { high: "border-l-red-400", medium: "border-l-amber-400", low: "border-l-emerald-400" };
const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
];
const PRIORITY_STYLE: Record<Priority, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const BURNOUT_LIMIT = 5;

const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const formatDate = (d: string) => new Date(d + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.status === 204 ? (undefined as T) : res.json();
}

export default function Board({ projectId }: { projectId: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<Priority | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const [error, setError] = useState("");

  const tasksUrl = `/api/tasks?projectId=${projectId}${filter === "all" ? "" : `&priority=${filter}`}`;
  const membersUrl = `/api/projects/${projectId}/members`;

  const loadTasks = useCallback(() => api<Task[]>(tasksUrl).then(setTasks), [tasksUrl]);
  const loadMembers = useCallback(() => api<Member[]>(membersUrl).then(setMembers), [membersUrl]);

  useEffect(() => {
    api<Task[]>(tasksUrl).then(setTasks).catch((e) => setError(e.message));
  }, [tasksUrl]);
  useEffect(() => {
    api<Member[]>(membersUrl).then(setMembers).catch((e) => setError(e.message));
  }, [membersUrl]);

  // Drag-and-drop: update the UI immediately, roll back if the API fails.
  async function moveTask(id: number, status: Status) {
    const prev = tasks;
    if (prev.find((t) => t.id === id)?.status === status) return;
    setTasks(prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      await api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      loadMembers(); // in-progress counts changed
    } catch (e) {
      setTasks(prev);
      setError((e as Error).message);
    }
  }

  async function deleteTask(id: number) {
    await api(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((ts) => ts.filter((t) => t.id !== id));
    loadMembers();
  }

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const overloaded = members.filter((m) => m.in_progress > BURNOUT_LIMIT);

  return (
    <main className="mx-auto w-full max-w-7xl p-6 space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="brand-gradient bg-clip-text text-3xl font-bold text-transparent">
          Task Management
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg brand-gradient px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90"
        >
          + New Task
        </button>
      </header>

      {error && (
        <div className="flex justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      {overloaded.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Burnout risk:</strong> {overloaded.map((m) => `${m.name} (${m.in_progress} in progress)`).join(", ")}
        </div>
      )}

      {/* Team + filter */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-gray-500">Team</span>
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-2 py-1">
              <Avatar name={m.name} burnout={m.in_progress > BURNOUT_LIMIT} />
              <div className="leading-tight">
                <p className="text-sm font-medium">{m.name}</p>
                <p className={`text-xs ${m.in_progress > BURNOUT_LIMIT ? "text-red-600 font-medium" : "text-gray-500"}`}>
                  {m.in_progress} in progress · {m.role}
                </p>
              </div>
            </div>
          ))}
          <AddMember projectId={projectId} onAdded={loadMembers} onError={setError} />
        </div>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
          {(["all", ...PRIORITIES] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`rounded-md px-3 py-1 capitalize ${filter === p ? "bg-white shadow-sm font-medium" : "text-gray-600"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* Kanban columns */}
      <section className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(status);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                setDragOver(null);
                moveTask(Number(e.dataTransfer.getData("text/plain")), status);
              }}
              className={`min-h-[60vh] rounded-xl border border-t-4 p-3 transition-colors ${
                dragOver === status ? "border-indigo-300 border-t-indigo-400 bg-indigo-100" : `border-gray-200 ${COLUMN_STYLE[status]}`
              }`}
            >
              <h2 className="mb-3 flex items-center gap-2 px-1 font-semibold">
                <span className={`h-2.5 w-2.5 rounded-full ${COLUMN_DOT[status]}`} />
                {COLUMN_LABEL[status]}
                <span className={`rounded-full px-2 text-xs font-semibold ${COUNT_STYLE[status]}`}>
                  {columnTasks.length}
                </span>
              </h2>
              <div className="space-y-2">
                {columnTasks.map((t) => (
                  <TaskCard key={t.id} task={t} assignee={t.assignee_id ? memberById[t.assignee_id] : undefined} onDelete={deleteTask} />
                ))}
                {columnTasks.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Drop tasks here</p>}
              </div>
            </div>
          );
        })}
      </section>

      {showForm && (
        <TaskForm
          projectId={projectId}
          members={members}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            loadTasks();
            loadMembers();
          }}
          onError={setError}
        />
      )}
    </main>
  );
}

function Avatar({ name, burnout }: { name: string; burnout?: boolean }) {
  return (
    <span
      title={burnout ? `${name} has more than ${BURNOUT_LIMIT} tasks in progress` : name}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        burnout ? "burnout" : AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
      }`}
    >
      {initials(name)}
    </span>
  );
}

function TaskCard({ task, assignee, onDelete }: { task: Task; assignee?: Member; onDelete: (id: number) => void }) {
  const overdue = task.due_date && task.status !== "done" && new Date(task.due_date + "T23:59") < new Date();
  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(task.id))}
      className={`group cursor-grab rounded-lg border border-l-4 border-gray-200 ${CARD_STRIPE[task.priority]} bg-white p-3 shadow-sm hover:shadow-md active:cursor-grabbing`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className={`rounded border px-1.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLE[task.priority]}`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => confirm("Delete this task?") && onDelete(task.id)}
            className="invisible px-1 text-gray-400 hover:text-red-600 group-hover:visible"
            aria-label="Delete task"
          >
            ✕
          </button>
          {assignee && <Avatar name={assignee.name} />}
        </div>
      </div>
      <h3 className={`font-medium ${task.status === "done" ? "text-gray-400 line-through" : ""}`}>{task.title}</h3>
      {task.description && <p className="mt-1 text-sm text-gray-500">{task.description}</p>}
      {task.due_date && (
        <p className={`mt-2 text-xs ${overdue ? "font-medium text-red-600" : "text-gray-500"}`}>
          📅 {formatDate(task.due_date)}
          {overdue && " · overdue"}
        </p>
      )}
    </article>
  );
}

function TaskForm({
  projectId,
  members,
  onClose,
  onCreated,
  onError,
}: {
  projectId: number;
  members: Member[];
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  async function submit(form: FormData) {
    try {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, ...Object.fromEntries(form) }),
      });
      onCreated();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form
        action={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold">New task</h2>
        <input name="title" required placeholder="Title" className={input} autoFocus />
        <textarea name="description" placeholder="Description" rows={3} className={input} />
        <div className="grid grid-cols-2 gap-3">
          <select name="priority" defaultValue="medium" className={input}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)} priority
              </option>
            ))}
          </select>
          <select name="status" defaultValue="todo" className={input}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {COLUMN_LABEL[s]}
              </option>
            ))}
          </select>
          <input name="due_date" type="date" className={input} />
          <select name="assignee_id" defaultValue="" className={input}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button className="rounded-lg brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">Create</button>
        </div>
      </form>
    </div>
  );
}

// Adds a user to the project by email, creating the user first if they don't exist yet.
function AddMember({ projectId, onAdded, onError }: { projectId: number; onAdded: () => void; onError: (msg: string) => void }) {
  const [open, setOpen] = useState(false);

  async function submit(form: FormData) {
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim().toLowerCase();
    try {
      const users = await api<User[]>("/api/users");
      const user =
        users.find((u) => u.email === email) ??
        (await api<User>("/api/users", { method: "POST", body: JSON.stringify({ name, email }) }));
      await api(`/api/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ user_id: user.id }) });
      setOpen(false);
      onAdded();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
        + Add user
      </button>
    );

  return (
    <form action={submit} className="flex gap-2">
      <input name="name" required placeholder="Name" className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-sm" autoFocus />
      <input name="email" type="email" required placeholder="Email" className="w-40 rounded-lg border border-gray-300 px-2 py-1 text-sm" />
      <button className="rounded-lg bg-indigo-600 px-3 py-1 text-sm text-white">Add</button>
      <button type="button" onClick={() => setOpen(false)} className="px-1 text-sm text-gray-500">
        ✕
      </button>
    </form>
  );
}

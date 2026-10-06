export const STATUSES = ["todo", "in_progress", "done"] as const;
export const PRIORITIES = ["low", "medium", "high"] as const;
export const ROLES = ["owner", "member", "viewer"] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

export type Task = {
  id: number;
  project_id: number;
  assignee_id: number | null;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null;
};

export type User = { id: number; name: string; email: string };

export type Member = User & { role: string; in_progress: number };

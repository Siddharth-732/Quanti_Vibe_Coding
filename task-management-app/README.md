# Task Management

A Kanban-style task board for personal or team productivity, built with **Next.js 16**, **PostgreSQL (Supabase)** and **Tailwind CSS**.

## Features

- **Kanban board**: To-Do, In Progress and Done columns with drag-and-drop. The card shrinks while you drag it and pops back when you drop it.
- **Task cards**: priority tag, due date (shown in red when overdue), description and assignee avatar.
- **Controls**: create a task, add users to the project, filter by priority, delete a task.
- **Workload balancing**: each column shows how many tasks it holds. If a team member has **more than 5 tasks in progress**, their avatar pulses red and a burnout warning banner appears.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js App Router, React 19, Tailwind CSS v4 |
| API | Next.js Route Handlers (REST endpoints under `/api`) |
| Database | PostgreSQL on Supabase, queried with plain SQL through the `pg` driver |

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project. Copy the connection string from **Connect → Session pooler** into `.env`:
   ```env
   DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   ```
   Special characters in the password must be URL-encoded (for example `#` becomes `%23`).
3. Create the tables and load the demo data. **This drops any existing tables first.**
   ```bash
   npm run db:setup
   ```
4. Start the app and open http://localhost:3000:
   ```bash
   npm run dev
   ```

## Data model

```
users ──< project_members >── projects ──< tasks
                (role)                     (status, priority, due_date, assignee)
```

- `projects` → `tasks` is the task hierarchy.
- `project_members` links users to projects and gives each a role: `owner`, `member` or `viewer`.

The schema and demo data are in [`db/schema.sql`](db/schema.sql).

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks?projectId=1&priority=high` | List tasks, optionally filtered by priority |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update a task (including status changes from drag-and-drop) |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET / POST | `/api/users` | List all users / create a user |
| GET / POST | `/api/projects/:id/members` | List the team with each person's in-progress count / add a user to the project |

## Project structure

```
db/
  schema.sql        tables + seed data
  setup.mjs         runs schema.sql (npm run db:setup)
src/
  app/api/          REST route handlers
  components/
    Board.tsx       the whole board UI
  lib/
    db.ts           Postgres connection pool
    types.ts        shared types and constants
```

## Trade-offs and limitations

- **No login.** The app is single-tenant and opens straight to project 1. Roles are stored but not enforced, because without login the app can't tell who is making a request.
- **Plain SQL instead of an ORM.** There are fewer moving parts and nothing to generate, but no automatic types or migrations.
- **Built-in browser drag-and-drop instead of a drag-and-drop library.** No extra dependency, but it doesn't work with touch screens or the keyboard.
- **Optimistic updates.** A moved card shows its new position immediately and rolls back if saving fails. There are no live updates between users; others see changes when they refresh.
- **No ordering within a column.** Cards are ordered by when they were created.

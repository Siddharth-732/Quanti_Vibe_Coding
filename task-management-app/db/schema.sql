-- Projects -> Tasks, Users join projects via project_members (with a role).
DROP TABLE IF EXISTS tasks, project_members, projects, users CASCADE;

CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE projects (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE project_members (
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member', 'viewer')),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE tasks (
  id          SERIAL PRIMARY KEY,
  project_id  INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON tasks (project_id, status);

-- Seed data
INSERT INTO users (name, email) VALUES
  ('Aarav Shah',  'aarav@example.com'),
  ('Priya Nair',  'priya@example.com'),
  ('Rohan Mehta', 'rohan@example.com'),
  ('Meera Iyer',  'meera@example.com');

INSERT INTO projects (name) VALUES ('Website Revamp');

INSERT INTO project_members (project_id, user_id, role) VALUES
  (1, 1, 'owner'), (1, 2, 'member'), (1, 3, 'member');

-- Rohan (3) has 6 in-progress tasks -> avatar should pulse red. Priya (2) has 1.
INSERT INTO tasks (project_id, assignee_id, title, description, status, priority, due_date) VALUES
  (1, 3, 'Build hero section',      'Responsive hero with CTA',  'in_progress', 'high',   CURRENT_DATE + 2),
  (1, 3, 'Pricing page layout',     NULL,                        'in_progress', 'medium', CURRENT_DATE + 4),
  (1, 3, 'Contact form validation', NULL,                        'in_progress', 'high',   CURRENT_DATE + 1),
  (1, 3, 'Blog pagination',         NULL,                        'in_progress', 'low',    CURRENT_DATE + 7),
  (1, 3, 'Footer + sitemap',        NULL,                        'in_progress', 'low',    CURRENT_DATE + 5),
  (1, 3, 'Lighthouse pass',         'Target 90+ on mobile',      'in_progress', 'high',   CURRENT_DATE + 3),
  (1, 2, 'Write About page copy',   NULL,                        'in_progress', 'medium', CURRENT_DATE + 3),
  (1, 1, 'Set up staging deploy',   NULL,                        'todo',        'high',   CURRENT_DATE + 5),
  (1, 2, 'Accessibility review',    'Keyboard nav, contrast',    'todo',        'medium', CURRENT_DATE + 10),
  (1, 1, 'Audit site analytics',    NULL,                        'done',        'low',    CURRENT_DATE - 3);

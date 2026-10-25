CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  solution_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_records_solution ON records(solution_id, created_at);

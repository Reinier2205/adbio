CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  solution_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
  body TEXT NOT NULL,
  gemini_output TEXT,
  wa_message_id TEXT NOT NULL UNIQUE,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_solution ON whatsapp_messages(solution_id, timestamp);

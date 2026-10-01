CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  ifc_file_name TEXT,
  ifc_file_size TEXT,
  grade TEXT,
  score_overall TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

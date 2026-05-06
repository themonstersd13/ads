CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS student_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user TEXT NOT NULL,
  owner_role TEXT NOT NULL DEFAULT 'student',
  last_write_node TEXT NOT NULL DEFAULT 'node1',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_records_email UNIQUE (email)
);

ALTER TABLE student_records
  ADD COLUMN IF NOT EXISTS owner_role TEXT NOT NULL DEFAULT 'student';

ALTER TABLE student_records
  ADD COLUMN IF NOT EXISTS last_write_node TEXT NOT NULL DEFAULT 'node1';

CREATE INDEX IF NOT EXISTS idx_student_records_updated_at
  ON student_records (updated_at DESC);

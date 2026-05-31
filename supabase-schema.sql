-- ─────────────────────────────────────────────────────────────
-- SOMA AFRICA — Phase 1 leads table
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- WARNING: drops the old waitlist_leads table and creates leads.
-- ─────────────────────────────────────────────────────────────

-- Remove legacy table if present
DROP TABLE IF EXISTS waitlist_leads;
DROP TABLE IF EXISTS leads;

CREATE TABLE leads (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ  DEFAULT now() NOT NULL,
  school_name   TEXT         NOT NULL,
  director_name TEXT         NOT NULL,
  role          TEXT         NOT NULL,   -- Director/Proprietor | Head Teacher | Academic Registrar | Other
  student_count INTEGER      NOT NULL,   -- validated ≥ 1 in API
  whatsapp      TEXT         NOT NULL UNIQUE,  -- UNIQUE enables upsert on duplicate submissions
  email         TEXT,                    -- optional
  tier          TEXT         DEFAULT 'warm',
  source        TEXT         DEFAULT 'website'
);

-- Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Public can submit (INSERT) but not read other leads
CREATE POLICY "Allow public inserts"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users (your team) can read
CREATE POLICY "Allow authenticated reads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- Note: no UPDATE or SELECT policy for anon — leads are write-only from the public site.

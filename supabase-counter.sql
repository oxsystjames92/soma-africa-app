-- ─────────────────────────────────────────────────────────────
-- SOMA AFRICA — Dynamic waitlist counter
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────

-- 1. Public stats table (anon-readable, service-writable)
CREATE TABLE IF NOT EXISTS public_stats (
  key   TEXT PRIMARY KEY,
  value INTEGER DEFAULT 0
);

ALTER TABLE public_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public reads"
  ON public_stats FOR SELECT
  TO anon
  USING (true);

-- 2. Seed with current lead count (idempotent — safe to re-run)
INSERT INTO public_stats (key, value)
SELECT 'waitlist_count', COUNT(*)::INTEGER FROM leads
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Trigger: increment counter on every new lead
CREATE OR REPLACE FUNCTION increment_waitlist_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public_stats SET value = value + 1 WHERE key = 'waitlist_count';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_lead_insert ON leads;
CREATE TRIGGER on_lead_insert
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION increment_waitlist_count();

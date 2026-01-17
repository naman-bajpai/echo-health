-- Enable Realtime for tables
-- This allows instant updates without page reload

-- Enable realtime for transcript_chunks
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE transcript_chunks;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Enable realtime for encounters (for status updates)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE encounters;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Enable realtime for artifacts (for field updates)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE artifacts;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

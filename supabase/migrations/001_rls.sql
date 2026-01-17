-- Echo Health Row Level Security
-- Migration: 001_rls.sql
-- 
-- Strategy: Service-role only writes (through Edge Functions)
-- This is the recommended hackathon approach for simplicity and security.

-- ===========================================
-- ENABLE RLS ON ALL TABLES
-- ===========================================
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers_cache ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- ENCOUNTERS POLICIES
-- ===========================================
-- Allow anon to read encounters (for demo purposes)
CREATE POLICY "Allow anon read encounters"
  ON encounters FOR SELECT
  TO anon
  USING (true);

-- Service role has full access (for Edge Functions)
CREATE POLICY "Allow service role full access to encounters"
  ON encounters FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- TRANSCRIPT_CHUNKS POLICIES
-- ===========================================
-- Allow anon to read transcript chunks
CREATE POLICY "Allow anon read transcript_chunks"
  ON transcript_chunks FOR SELECT
  TO anon
  USING (true);

-- Service role has full access
CREATE POLICY "Allow service role full access to transcript_chunks"
  ON transcript_chunks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- ARTIFACTS POLICIES
-- ===========================================
-- Allow anon to read artifacts
CREATE POLICY "Allow anon read artifacts"
  ON artifacts FOR SELECT
  TO anon
  USING (true);

-- Service role has full access
CREATE POLICY "Allow service role full access to artifacts"
  ON artifacts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- PROVIDERS_CACHE POLICIES
-- ===========================================
-- Allow anon to read cached providers
CREATE POLICY "Allow anon read providers_cache"
  ON providers_cache FOR SELECT
  TO anon
  USING (true);

-- Service role has full access
CREATE POLICY "Allow service role full access to providers_cache"
  ON providers_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- STORAGE POLICIES
-- ===========================================
-- Summaries bucket: read access via signed URLs only (handled by functions)
CREATE POLICY "Allow service role access to summaries"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'summaries')
  WITH CHECK (bucket_id = 'summaries');

-- Audio bucket: read access via signed URLs only
CREATE POLICY "Allow service role access to audio"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'audio')
  WITH CHECK (bucket_id = 'audio');

-- Echo Health Database Schema
-- Migration: 000_init.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- ENCOUNTERS TABLE
-- One row per patient visit
-- ===========================================
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'intake' CHECK (status IN ('intake', 'visit', 'checkout')),
  patient_name TEXT,
  patient_dob DATE,
  reason_for_visit TEXT,
  livekit_room_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for status queries
CREATE INDEX idx_encounters_status ON encounters(status);
CREATE INDEX idx_encounters_created_at ON encounters(created_at DESC);

-- ===========================================
-- TRANSCRIPT_CHUNKS TABLE
-- Streaming VTT chunks from transcription
-- ===========================================
CREATE TABLE transcript_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('patient', 'clinician', 'staff')),
  text TEXT NOT NULL,
  timestamp_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for encounter lookups
CREATE INDEX idx_transcript_chunks_encounter ON transcript_chunks(encounter_id);
CREATE INDEX idx_transcript_chunks_created ON transcript_chunks(encounter_id, created_at);

-- ===========================================
-- ARTIFACTS TABLE
-- Generated content: fields, draft notes, referrals, summaries
-- ===========================================
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('fields', 'draft_note', 'referral', 'summary')),
  content JSONB NOT NULL DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for artifact queries
CREATE INDEX idx_artifacts_encounter ON artifacts(encounter_id);
CREATE INDEX idx_artifacts_type ON artifacts(encounter_id, type);

-- ===========================================
-- PROVIDERS_CACHE TABLE
-- Cached provider search results
-- ===========================================
CREATE TABLE providers_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_hash TEXT NOT NULL UNIQUE,
  specialty TEXT NOT NULL,
  location TEXT,
  providers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours'
);

-- Index for cache lookups
CREATE INDEX idx_providers_cache_hash ON providers_cache(query_hash);
CREATE INDEX idx_providers_cache_expires ON providers_cache(expires_at);

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_encounters_updated_at
  BEFORE UPDATE ON encounters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- STORAGE BUCKETS
-- ===========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('summaries', 'summaries', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio', 'audio', false)
ON CONFLICT (id) DO NOTHING;

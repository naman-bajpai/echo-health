-- Billing Codes Migration
-- Adds support for ICD-10 and CPT billing codes

-- Update artifact types to include billing_codes
-- (Already handled in code, but documenting here)

-- Create billing_codes table for historical tracking
CREATE TABLE IF NOT EXISTS billing_codes_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  icd10_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  cpt_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_billing_codes_encounter_id ON billing_codes_history(encounter_id);
CREATE INDEX IF NOT EXISTS idx_billing_codes_verified ON billing_codes_history(verified);
CREATE INDEX IF NOT EXISTS idx_billing_codes_generated_by ON billing_codes_history(generated_by);

-- Enable RLS
ALTER TABLE billing_codes_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view billing codes for their encounters"
  ON billing_codes_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM encounters 
      WHERE encounters.id = billing_codes_history.encounter_id
    )
  );

CREATE POLICY "Users can insert billing codes"
  ON billing_codes_history FOR INSERT
  WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Users can update billing codes they generated"
  ON billing_codes_history FOR UPDATE
  USING (auth.uid() = generated_by OR auth.uid() = verified_by);

-- Add billing status to encounters
ALTER TABLE encounters 
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'pending' CHECK (billing_status IN ('pending', 'generated', 'verified', 'submitted'));

-- Create view for latest billing codes per encounter
CREATE OR REPLACE VIEW latest_billing_codes AS
SELECT DISTINCT ON (encounter_id)
  id,
  encounter_id,
  icd10_codes,
  cpt_codes,
  generated_at,
  generated_by,
  verified,
  verified_at,
  verified_by,
  notes
FROM billing_codes_history
ORDER BY encounter_id, created_at DESC;

-- Add comments
COMMENT ON TABLE billing_codes_history IS 'Historical tracking of billing codes with verification status';
COMMENT ON COLUMN billing_codes_history.icd10_codes IS 'JSON array of ICD-10 diagnosis codes';
COMMENT ON COLUMN billing_codes_history.cpt_codes IS 'JSON array of CPT procedure codes';
COMMENT ON COLUMN billing_codes_history.verified IS 'Whether codes have been verified by a medical coder or doctor';
COMMENT ON COLUMN encounters.billing_status IS 'Status of billing: pending, generated, verified, or submitted';

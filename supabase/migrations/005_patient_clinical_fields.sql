-- Add clinical fields to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight_kg DECIMAL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS height_cm DECIMAL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications JSONB DEFAULT '[]';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS past_medical_history TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_language TEXT DEFAULT 'English';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS ethnicity TEXT;

-- Create a view for patient clinical summary
CREATE OR REPLACE VIEW patient_summaries AS
SELECT 
  p.*,
  (SELECT count(*) FROM encounters e WHERE e.patient_id = p.id) as total_encounters,
  (SELECT created_at FROM encounters e WHERE e.patient_id = p.id ORDER BY created_at DESC LIMIT 1) as last_consult_at,
  (SELECT status FROM encounters e WHERE e.patient_id = p.id ORDER BY created_at DESC LIMIT 1) as last_consult_status
FROM patients p;

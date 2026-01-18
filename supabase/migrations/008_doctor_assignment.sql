-- Add doctor assignment to encounters
ALTER TABLE encounters 
ADD COLUMN IF NOT EXISTS assigned_doctor_id TEXT,
ADD COLUMN IF NOT EXISTS assigned_doctor_name TEXT;

-- Index for doctor lookups
CREATE INDEX IF NOT EXISTS idx_encounters_assigned_doctor ON encounters(assigned_doctor_id);

-- Add checkout status
-- Note: status column is already TEXT, but we need to update the constraint

-- Update status check constraint to include checkout
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'encounters_status_check' 
        AND conrelid = 'encounters'::regclass
    ) THEN
        ALTER TABLE encounters DROP CONSTRAINT encounters_status_check;
    END IF;
END $$;

ALTER TABLE encounters
ADD CONSTRAINT encounters_status_check 
CHECK (status IN ('intake', 'visit', 'checkout', 'completed'));

COMMENT ON COLUMN encounters.assigned_doctor_id IS 'ID of assigned doctor (can be demo ID or UUID)';
COMMENT ON COLUMN encounters.assigned_doctor_name IS 'Name of assigned doctor for display';

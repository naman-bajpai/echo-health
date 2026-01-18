# Run Database Migration

## Quick Copy-Paste SQL

Copy and paste this into **Supabase Dashboard → SQL Editor** and click **Run**:

```sql
-- Add doctor assignment to encounters
ALTER TABLE encounters 
ADD COLUMN IF NOT EXISTS assigned_doctor_id TEXT,
ADD COLUMN IF NOT EXISTS assigned_doctor_name TEXT;

-- Index for doctor lookups
CREATE INDEX IF NOT EXISTS idx_encounters_assigned_doctor ON encounters(assigned_doctor_id);

-- Update status check constraint to include checkout
DO $$ 
BEGIN
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
```

## What This Does

1. ✅ Adds `assigned_doctor_id` and `assigned_doctor_name` columns to encounters
2. ✅ Creates index for fast doctor lookups
3. ✅ Updates status constraint to allow 'checkout' and 'completed' statuses
4. ✅ Adds helpful comments

## After Running

1. **Refresh your app**
2. **Test as Nurse:**
   - Start encounter → Go to Clinical Fields tab
   - You should see "Assign Doctor" and "Billing Codes" panels
3. **Test as Doctor:**
   - Login as doctor → Should see doctor dashboard with assigned patients
4. **Test Checkout:**
   - In encounter → Click "Checkout" in sidebar
   - Should see billing codes page

## Troubleshooting

If you get an error about the constraint:
- The safe version above handles this automatically
- If still failing, check if constraint exists: `\d encounters` in psql

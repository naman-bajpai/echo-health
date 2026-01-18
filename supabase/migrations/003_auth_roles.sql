-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User profiles with roles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('nurse', 'doctor')),
  license_number TEXT,
  specialty TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table to track visits
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT UNIQUE, -- Medical Record Number
  full_name TEXT NOT NULL,
  dob DATE,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  insurance_provider TEXT,
  insurance_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to encounters
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id);
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS visit_number INTEGER DEFAULT 1;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergent'));
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS specialist_needed BOOLEAN DEFAULT FALSE;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS recommended_specialist TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS urgency_reason TEXT;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role full access to profiles" ON profiles;
CREATE POLICY "Service role full access to profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to view doctors (for assignment purposes)
DROP POLICY IF EXISTS "Authenticated users can view doctors" ON profiles;
CREATE POLICY "Authenticated users can view doctors" ON profiles
  FOR SELECT TO authenticated USING (role = 'doctor');

-- Patients policies (all authenticated users can access)
DROP POLICY IF EXISTS "Authenticated users can view patients" ON patients;
CREATE POLICY "Authenticated users can view patients" ON patients
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert patients" ON patients;
CREATE POLICY "Authenticated users can insert patients" ON patients
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update patients" ON patients;
CREATE POLICY "Authenticated users can update patients" ON patients
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access to patients" ON patients;
CREATE POLICY "Service role full access to patients" ON patients
  FOR ALL USING (auth.role() = 'service_role');

-- Update encounters policies for authenticated users
DROP POLICY IF EXISTS "Allow anon read" ON encounters;
DROP POLICY IF EXISTS "Authenticated users can view encounters" ON encounters;
CREATE POLICY "Authenticated users can view encounters" ON encounters
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert encounters" ON encounters;
CREATE POLICY "Authenticated users can insert encounters" ON encounters
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update encounters" ON encounters;
CREATE POLICY "Authenticated users can update encounters" ON encounters
  FOR UPDATE TO authenticated USING (true);

-- Keep anon read for backwards compatibility
DROP POLICY IF EXISTS "Allow anon read encounters" ON encounters;
CREATE POLICY "Allow anon read encounters" ON encounters
  FOR SELECT TO anon USING (true);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'nurse')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get visit number for a patient
CREATE OR REPLACE FUNCTION get_next_visit_number(p_patient_id UUID)
RETURNS INTEGER AS $$
DECLARE
  visit_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO visit_count
  FROM encounters
  WHERE patient_id = p_patient_id;
  RETURN visit_count;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for new tables (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE patients;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

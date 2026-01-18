-- Demo Mode: Allow anonymous access for testing
-- This relaxes RLS policies for hackathon demo purposes

-- Allow anon to insert/update patients
DROP POLICY IF EXISTS "Anon can view patients" ON patients;
CREATE POLICY "Anon can view patients" ON patients
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can insert patients" ON patients;
CREATE POLICY "Anon can insert patients" ON patients
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update patients" ON patients;
CREATE POLICY "Anon can update patients" ON patients
  FOR UPDATE TO anon USING (true);

-- Allow anon to insert/update encounters
DROP POLICY IF EXISTS "Anon can insert encounters" ON encounters;
CREATE POLICY "Anon can insert encounters" ON encounters
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update encounters" ON encounters;
CREATE POLICY "Anon can update encounters" ON encounters
  FOR UPDATE TO anon USING (true);

-- Allow anon to insert/update transcript_chunks
DROP POLICY IF EXISTS "Anon can view transcript_chunks" ON transcript_chunks;
CREATE POLICY "Anon can view transcript_chunks" ON transcript_chunks
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can insert transcript_chunks" ON transcript_chunks;
CREATE POLICY "Anon can insert transcript_chunks" ON transcript_chunks
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to insert/update artifacts
DROP POLICY IF EXISTS "Anon can view artifacts" ON artifacts;
CREATE POLICY "Anon can view artifacts" ON artifacts
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can insert artifacts" ON artifacts;
CREATE POLICY "Anon can insert artifacts" ON artifacts
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update artifacts" ON artifacts;
CREATE POLICY "Anon can update artifacts" ON artifacts
  FOR UPDATE TO anon USING (true);

-- Allow anon to view doctors (profiles with role='doctor')
DROP POLICY IF EXISTS "Anon can view doctors" ON profiles;
CREATE POLICY "Anon can view doctors" ON profiles
  FOR SELECT TO anon USING (role = 'doctor');

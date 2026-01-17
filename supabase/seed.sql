-- Echo Health Seed Data
-- Optional demo data for development

-- Demo encounter
INSERT INTO encounters (id, status, patient_name, patient_dob, reason_for_visit)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'intake',
  'Demo Patient',
  '1990-01-15',
  'General checkup'
);

-- Demo transcript chunks
INSERT INTO transcript_chunks (encounter_id, speaker, text, timestamp_ms)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'staff', 'Good morning! How can I help you today?', 0),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'patient', 'Hi, I am here for my annual checkup.', 3000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'staff', 'Perfect. Can you confirm your date of birth?', 6000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'patient', 'January 15th, 1990.', 9000);

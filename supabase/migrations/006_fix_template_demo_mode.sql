-- Fix EHR Templates for Demo Mode
-- Allow templates to be created and accessed without authentication

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own templates" ON ehr_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON ehr_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON ehr_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON ehr_templates;

-- Create new policies that allow demo mode (null uploaded_by)
CREATE POLICY "Allow viewing templates"
  ON ehr_templates FOR SELECT
  USING (
    uploaded_by IS NULL OR 
    auth.uid() = uploaded_by
  );

CREATE POLICY "Allow inserting templates"
  ON ehr_templates FOR INSERT
  WITH CHECK (
    uploaded_by IS NULL OR 
    auth.uid() = uploaded_by
  );

CREATE POLICY "Allow updating templates"
  ON ehr_templates FOR UPDATE
  USING (
    uploaded_by IS NULL OR 
    auth.uid() = uploaded_by
  );

CREATE POLICY "Allow deleting templates"
  ON ehr_templates FOR DELETE
  USING (
    uploaded_by IS NULL OR 
    auth.uid() = uploaded_by
  );

-- Same for generated_questions - allow demo mode
DROP POLICY IF EXISTS "Users can view questions for their encounters" ON generated_questions;
DROP POLICY IF EXISTS "Users can insert questions" ON generated_questions;

CREATE POLICY "Allow viewing questions"
  ON generated_questions FOR SELECT
  USING (true);

CREATE POLICY "Allow inserting questions"
  ON generated_questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow updating questions"
  ON generated_questions FOR UPDATE
  USING (true);

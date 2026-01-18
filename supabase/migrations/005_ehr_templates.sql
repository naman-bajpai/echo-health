-- EHR Templates and Questions Migration
-- Adds support for uploading EHR templates and generating questions

-- Create ehr_templates table
CREATE TABLE IF NOT EXISTS ehr_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES auth.users(id),
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL, -- The actual template text/content
  file_url TEXT, -- URL to the uploaded file in storage
  file_type TEXT, -- pdf, docx, txt, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create generated_questions table
CREATE TABLE IF NOT EXISTS generated_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES ehr_templates(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  questions JSONB NOT NULL, -- Array of questions with metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add template_id to encounters table
ALTER TABLE encounters 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES ehr_templates(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ehr_templates_uploaded_by ON ehr_templates(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_generated_questions_template_id ON generated_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_questions_encounter_id ON generated_questions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounters_template_id ON encounters(template_id);

-- Enable Row Level Security
ALTER TABLE ehr_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ehr_templates
CREATE POLICY "Users can view their own templates"
  ON ehr_templates FOR SELECT
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can insert their own templates"
  ON ehr_templates FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own templates"
  ON ehr_templates FOR UPDATE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own templates"
  ON ehr_templates FOR DELETE
  USING (auth.uid() = uploaded_by);

-- RLS Policies for generated_questions
CREATE POLICY "Users can view questions for their encounters"
  ON generated_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM encounters 
      WHERE encounters.id = generated_questions.encounter_id
    )
  );

CREATE POLICY "Users can insert questions"
  ON generated_questions FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for EHR templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('ehr-templates', 'ehr-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ehr-templates bucket
CREATE POLICY "Users can upload their own templates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ehr-templates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own templates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ehr-templates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own templates"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ehr-templates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add comments for documentation
COMMENT ON TABLE ehr_templates IS 'Stores uploaded EHR templates from nurses';
COMMENT ON TABLE generated_questions IS 'Stores AI-generated questions based on EHR templates';
COMMENT ON COLUMN ehr_templates.template_content IS 'Extracted text content from the uploaded template';
COMMENT ON COLUMN generated_questions.questions IS 'JSON array of questions with structure: [{question: string, category: string, required: boolean, answered: boolean}]';

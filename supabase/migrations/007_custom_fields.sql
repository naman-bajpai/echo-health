-- Add custom_fields column to ehr_templates
ALTER TABLE ehr_templates 
ADD COLUMN IF NOT EXISTS custom_fields JSONB;

-- Add comment
COMMENT ON COLUMN ehr_templates.custom_fields IS 'Array of custom field definitions: [{name, type, required, placeholder}]';

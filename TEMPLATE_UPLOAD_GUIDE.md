# Template Upload Feature - Implementation Guide

## Overview

The template upload feature has been integrated into the new encounter flow. Nurses can now upload EHR templates, and ChatGPT automatically generates questions based on the template content.

## What Was Implemented

### 1. **New Encounter Flow (3 Steps)**

**Step 1: Select/Create Patient** (unchanged)
- Search existing patients
- Create new patient

**Step 2: Upload/Select Template** (NEW)
- Upload new EHR template (TXT file or paste content)
- Select from existing templates
- Skip template option (uses default questions)

**Step 3: Visit Details** (unchanged)
- Enter reason for visit
- Start encounter

### 2. **Template Upload Component**

**Location**: `apps/web/components/TemplateUpload.tsx`

**Features**:
- File upload (TXT files)
- Paste template content directly
- Select from existing templates
- Auto-generates questions after upload
- Shows question count after generation

### 3. **Database Integration**

**New Tables** (from migrations):
- `ehr_templates` - Stores uploaded templates
- `generated_questions` - Stores AI-generated questions
- `encounters.template_id` - Links encounter to template

### 4. **API Functions**

**New Functions**:
- `upload-ehr-template` - Uploads template and generates questions
- `generate-questions` - Generates questions from existing template
- `start-encounter` - Updated to accept `template_id`

## How It Works

### Workflow

1. **Nurse starts new encounter**
   - Selects or creates patient
   - Reaches template step

2. **Template Selection**
   - Option A: Upload new template
     - Uploads TXT file OR pastes content
     - ChatGPT analyzes template
     - Generates questions automatically
   - Option B: Select existing template
     - Chooses from saved templates
     - Generates questions for that template
   - Option C: Skip template
     - Uses default questions

3. **Questions Generated**
   - Questions appear in success message
   - Questions saved to database
   - Linked to encounter

4. **Continue to Visit**
   - Enter reason for visit
   - Start encounter
   - Template ID saved to encounter

5. **During Encounter**
   - Questions available for reference
   - Nurse asks questions during conversation
   - Transcript updates in real-time
   - SOAP note auto-generates

## File Structure

```
apps/web/
├── app/
│   └── new-encounter/
│       └── page.tsx (updated with template step)
├── components/
│   └── TemplateUpload.tsx (new component)
└── lib/
    └── api.ts (updated with template functions)

supabase/
├── functions/
│   ├── upload-ehr-template/
│   │   └── index.ts (new function)
│   ├── generate-questions/
│   │   └── index.ts (new function)
│   └── start-encounter/
│       └── index.ts (updated to accept template_id)
└── migrations/
    ├── 005_ehr_templates.sql (new migration)
    └── 006_billing_codes.sql (new migration)
```

## Usage Examples

### Upload New Template

```typescript
// In TemplateUpload component
const handleUpload = async () => {
  const response = await fetch("/api/supabase/upload-ehr-template", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateName: "General Intake Form",
      templateContent: "Patient Name: ___\nDOB: ___\n...",
    }),
  });
  const { template, questions } = await response.json();
};
```

### Select Existing Template

```typescript
// In TemplateUpload component
const handleSelectTemplate = async (templateId: string) => {
  const response = await fetch("/api/supabase/generate-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId }),
  });
  const { questions } = await response.json();
};
```

### Start Encounter with Template

```typescript
// In new-encounter page
const result = await startEncounter(
  patientName,
  reasonForVisit,
  patientId,
  userId,
  templateId // Pass template ID
);
```

## Template Content Format

Templates can be in any format, but structured templates work best:

```
PATIENT INFORMATION
- Name: ___
- Date of Birth: ___
- Phone: ___

CHIEF COMPLAINT
- Reason for visit: ___

MEDICAL HISTORY
- Past conditions: ___
- Surgeries: ___

MEDICATIONS
- Current medications: ___

ALLERGIES
- Known allergies: ___
```

ChatGPT will analyze the template and generate appropriate questions.

## Question Structure

Generated questions have this structure:

```json
{
  "id": "q_1",
  "question": "What is your full name?",
  "category": "demographics",
  "required": true,
  "answered": false,
  "field_mapping": "patient_name"
}
```

**Categories**:
- `demographics` - Name, DOB, contact info
- `chief_complaint` - Reason for visit
- `medical_history` - Past conditions, surgeries
- `medications` - Current medications
- `allergies` - Known allergies
- `social_history` - Smoking, alcohol, etc.
- `review_of_systems` - Symptoms by body system
- `vital_signs` - Blood pressure, temperature, etc.

## Next Steps

1. **Display Questions During Encounter**
   - Create QuestionsPanel component
   - Show questions in encounter page
   - Mark questions as answered

2. **PDF/DOCX Support**
   - Add server-side text extraction
   - Support PDF and DOCX uploads

3. **Question Tracking**
   - Track which questions were asked
   - Auto-mark questions as answered based on transcript

4. **Template Management**
   - Edit existing templates
   - Delete templates
   - Template versioning

## Testing

### Test Template Upload

1. Go to `/new-encounter`
2. Select or create patient
3. Upload a template or select existing
4. Verify questions are generated
5. Continue to visit details
6. Start encounter
7. Verify template_id is saved to encounter

### Test Question Generation

```bash
# Test via API
curl -X POST https://your-project.supabase.co/functions/v1/generate-questions \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template-uuid-here"
  }'
```

## Troubleshooting

### Questions Not Generating

1. Check OpenAI API key is set
2. Verify template content is not empty
3. Check function logs in Supabase dashboard
4. Ensure template was saved successfully

### Template Not Saving

1. Check user authentication
2. Verify RLS policies allow insert
3. Check database logs
4. Ensure template_name is provided

### Template Not Linking to Encounter

1. Verify template_id is passed to startEncounter
2. Check encounter table has template_id column
3. Verify foreign key relationship exists

## Security

- Templates are user-specific (RLS enabled)
- Only authenticated users can upload
- Templates linked to user who uploaded
- Questions are encounter-specific

## Performance

- Questions generate in ~5-10 seconds
- Template upload is instant
- Questions cached per template
- Can reuse questions for multiple encounters

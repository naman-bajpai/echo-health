# Echo Health - Complete Implementation Guide

## Overview

Echo Health is a comprehensive healthcare encounter management system that streamlines the workflow from patient intake to billing. This guide covers the complete implementation including EHR template upload, AI-generated questions, real-time transcription, and automated billing codes.

## System Architecture

### Workflow

```
1. Nurse uploads EHR template
   ↓
2. ChatGPT analyzes template → Generates questions
   ↓
3. Nurse starts encounter with patient
   ↓
4. LiveKit transcribes conversation in real-time
   ↓
5. ChatGPT analyzes transcript → Updates all panels:
   - Transcript
   - Clinical Fields
   - Draft SOAP Note
   - Referrals
   - Visit Summary
   - Billing Codes (ICD-10 + CPT)
   ↓
6. Generate PDF with all information
   ↓
7. Nurse forwards to doctor for review
   ↓
8. Doctor views complete report + PDF
```

## Database Schema

### Core Tables

#### 1. `ehr_templates`
Stores uploaded EHR templates from nurses.

```sql
- id: UUID (primary key)
- uploaded_by: UUID (references auth.users)
- template_name: TEXT
- template_content: TEXT (extracted text)
- file_url: TEXT (storage URL)
- file_type: TEXT (pdf, docx, txt)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 2. `generated_questions`
Stores AI-generated questions based on templates.

```sql
- id: UUID (primary key)
- template_id: UUID (references ehr_templates)
- encounter_id: UUID (references encounters)
- questions: JSONB (array of question objects)
- created_at: TIMESTAMPTZ
```

Question Object Structure:
```json
{
  "id": "q_1",
  "question": "What is your full name?",
  "category": "demographics",
  "required": true,
  "answered": false,
  "answer": "John Doe",
  "field_mapping": "patient_name"
}
```

#### 3. `billing_codes_history`
Tracks billing codes with verification status.

```sql
- id: UUID (primary key)
- encounter_id: UUID (references encounters)
- icd10_codes: JSONB (array of ICD-10 codes)
- cpt_codes: JSONB (array of CPT codes)
- generated_at: TIMESTAMPTZ
- generated_by: UUID
- verified: BOOLEAN
- verified_at: TIMESTAMPTZ
- verified_by: UUID
- notes: TEXT
- created_at: TIMESTAMPTZ
```

#### 4. `encounters` (updated)
Added new columns:
```sql
- template_id: UUID (references ehr_templates)
- billing_status: TEXT (pending, generated, verified, submitted)
```

#### 5. `artifacts` (updated)
New artifact types:
- `billing_codes`
- `diagnosis`

## API Endpoints

### 1. Upload EHR Template
**POST** `/functions/v1/upload-ehr-template`

```typescript
Request:
{
  templateName: string;
  templateContent: string;
  fileUrl?: string;
  fileType?: string;
}

Response:
{
  template: EHRTemplate;
  questions: Question[];
  message: string;
}
```

### 2. Generate Questions
**POST** `/functions/v1/generate-questions`

```typescript
Request:
{
  templateId: string;
  encounterId?: string;
}

Response:
{
  questions: Question[];
  questionsId: string;
  templateId: string;
  encounterId?: string;
}
```

### 3. Generate Billing Codes
**POST** `/functions/v1/generate-billing-codes`

```typescript
Request:
{
  encounterId: string;
}

Response:
{
  billingCodes: {
    icd10_codes: BillingCode[];
    cpt_codes: BillingCode[];
    generated_at: string;
    disclaimer: string;
  };
  encounterId: string;
}
```

### 4. Generate All
**POST** `/functions/v1/generate-all`

Generates SOAP note, summary, and billing codes in one call.

```typescript
Request:
{
  encounterId: string;
}

Response:
{
  draftNote: DraftNote;
  summary: PatientSummary;
  billingCodes: BillingCodesResult;
  encounterId: string;
}
```

## Frontend Components

### 1. Template Upload Component
**Location**: `apps/web/components/TemplateUpload.tsx` (to be created)

Features:
- File upload (PDF, DOCX, TXT)
- Text extraction
- Template preview
- Question generation trigger

### 2. Questions Panel
**Location**: `apps/web/components/QuestionsPanel.tsx` (to be created)

Features:
- Display AI-generated questions
- Category grouping
- Required field indicators
- Answer tracking
- Progress indicator

### 3. Billing Codes Panel
**Location**: `apps/web/components/SummaryPanel.tsx` (updated)

Features:
- ICD-10 codes display
- CPT codes display
- Confidence indicators
- Verification status
- Rationale display

## Running Migrations

```bash
# Navigate to project root
cd /Users/kise/Desktop/Nexhacks/Echo\ Health

# Run migrations
npx supabase db push

# Or apply specific migration
npx supabase migration up
```

## Deploying Edge Functions

```bash
# Deploy all functions
npx supabase functions deploy --legacy-bundle

# Deploy specific functions
npx supabase functions deploy upload-ehr-template --legacy-bundle
npx supabase functions deploy generate-questions --legacy-bundle
npx supabase functions deploy generate-billing-codes --legacy-bundle
npx supabase functions deploy generate-all --legacy-bundle
```

## Environment Variables

### Required Secrets

```bash
# OpenAI API (for ChatGPT)
npx supabase secrets set OPENAI_API_KEY=sk-...

# LiveKit (for transcription)
npx supabase secrets set LIVEKIT_URL=wss://...
npx supabase secrets set LIVEKIT_API_KEY=...
npx supabase secrets set LIVEKIT_API_SECRET=...

# Supabase (auto-set)
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
# SUPABASE_ANON_KEY
```

### Frontend Environment (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_LIVEKIT_URL=wss://...livekit.cloud
```

## Testing the Complete Workflow

### 1. Upload EHR Template

```bash
curl -X POST https://your-project.supabase.co/functions/v1/upload-ehr-template \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "General Intake Form",
    "templateContent": "Patient Name: ___\nDate of Birth: ___\nChief Complaint: ___\n..."
  }'
```

### 2. Start Encounter with Template

```typescript
const { encounterId } = await startEncounter(
  patientName,
  reasonForVisit,
  patientId,
  createdBy,
  templateId // Pass the template ID
);
```

### 3. Generate Questions

```typescript
const { questions } = await generateQuestions(templateId, encounterId);
```

### 4. Conduct Encounter

- Start LiveKit transcription
- Ask questions from generated list
- Transcript updates in real-time
- SOAP note auto-generates after each input

### 5. Generate All Documentation

```typescript
const { draftNote, summary, billingCodes } = await generateAll(encounterId);
```

### 6. Download PDF

```typescript
const { pdfUrl } = await getSummaryPdfUrl(encounterId);
window.open(pdfUrl, "_blank");
```

## Billing Codes

### ICD-10 Codes (Diagnosis)
- Format: Letter + 2-7 digits (e.g., I10, E11.9)
- Generated based on symptoms and diagnosis
- Includes confidence level and rationale

### CPT Codes (Procedures)
- Format: 5-digit codes (e.g., 99213, 85025)
- Generated based on visit complexity and procedures
- Includes E&M codes for office visits

### Verification Workflow

1. AI generates codes (confidence: high/medium/low)
2. Nurse reviews codes in Summary panel
3. Doctor verifies codes during review
4. Medical coder can mark as verified
5. Codes submitted to billing system

## PDF Generation

The PDF includes:
- Patient information
- Visit summary
- Symptoms and diagnoses
- Treatment plan
- Medications
- Patient instructions
- Warning signs
- **Billing codes (ICD-10 + CPT)**
- **Draft SOAP note**
- Follow-up instructions

## Real-time Updates

All panels update automatically via Supabase real-time subscriptions:
- Transcript chunks
- Extracted fields
- Draft notes
- Summaries
- Billing codes

## Security

### Row Level Security (RLS)
- Users can only access their own templates
- Users can only view encounters they're involved in
- Billing codes are protected by RLS

### Storage Security
- Templates stored in private bucket
- Access controlled by RLS policies
- Signed URLs for temporary access

## Performance Optimization

1. **Parallel Generation**: SOAP, summary, and billing codes generate in parallel
2. **Caching**: Provider search results cached
3. **Indexing**: Database indexes on frequently queried columns
4. **Real-time**: Supabase subscriptions for instant updates

## Troubleshooting

### Common Issues

1. **SOAP note not generating**
   - Check OPENAI_API_KEY is set
   - Verify transcript has content
   - Check function logs

2. **Billing codes missing**
   - Ensure generate-all or generate-billing-codes was called
   - Check artifacts table for billing_codes type
   - Verify OpenAI API is configured

3. **Questions not generating**
   - Check template content is not empty
   - Verify OpenAI API key
   - Check function logs for errors

4. **PDF missing billing codes**
   - Ensure billing codes artifact exists
   - Check PDF generation function logs
   - Verify billingCodes parameter is passed

## Next Steps

1. Create template upload UI component
2. Create questions panel component
3. Add template selection to new encounter flow
4. Add billing code verification UI
5. Add doctor review workflow
6. Add billing submission integration

## Support

For issues or questions:
1. Check function logs: Supabase Dashboard → Edge Functions → Logs
2. Check database: Supabase Dashboard → Table Editor
3. Check real-time: Supabase Dashboard → Database → Replication
4. Review this documentation

## License

Private - All rights reserved

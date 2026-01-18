# 🩺 Echo Health

> **AI-Powered Ambient Clinical Documentation** — Transforming patient encounters into comprehensive, compliant medical records in real-time.

[![Built for NexHacks](https://img.shields.io/badge/Built%20for-NexHacks-blue?style=for-the-badge)](https://nexhacks.dev)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?style=for-the-badge&logo=openai)](https://openai.com/)

---

## 💡 Inspiration

Healthcare professionals spend **2+ hours daily** on documentation — time that could be spent with patients. Nurses manually transcribe conversations, doctors review mountains of paperwork, and administrative burden leads to burnout. We asked: *What if AI could handle the documentation while clinicians focus on care?*

Echo Health was born from the vision of **ambient intelligence in healthcare** — an AI assistant that listens, understands, and documents, so medical staff can be fully present with their patients.

---

## 🎯 What It Does

Echo Health is a comprehensive clinical documentation platform that:

### For Nurses
- **🎙️ Real-Time Transcription** — Ambient listening during patient encounters with LiveKit-powered audio transcription
- **🧠 Smart Clinical Analysis** — AI suggests differential diagnoses and recommended follow-up questions as conversations unfold
- **📋 Auto-Generated SOAP Notes** — Structured clinical notes created instantly from transcripts
- **💳 Automated Billing Codes** — ICD-10 and CPT codes detected from conversation context
- **👨‍⚕️ Doctor Assignment** — Assign patients to available physicians with one click
- **📄 Referral Generation** — AI-drafted specialist referral letters ready for review and sending

### For Doctors
- **📊 Patient Dashboard** — View all assigned patients with urgency filtering
- **📑 Comprehensive Reports** — Download complete PDF documentation including SOAP notes, billing codes, and visit summaries
- **✅ Quick Review** — All encounter data consolidated for efficient review and approval

### For Patients
- **📖 Visit Summaries** — Plain-language explanations of their visit (with appropriate disclaimers)
- **🔊 Audio Narration** — Text-to-speech summaries for accessibility

---

## 🛠️ How We Built It

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ECHO HEALTH                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│   │  LiveKit │───▶│ Supabase │───▶│  OpenAI  │───▶│  Output  │ │
│   │  Audio   │    │  Edge Fn │    │  GPT-4   │    │ Artifacts│ │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│        │                │               │               │       │
│        ▼                ▼               ▼               ▼       │
│   Transcripts     Real-time       Clinical         SOAP Notes  │
│                   Processing      Analysis         Billing     │
│                                   Questions        Referrals   │
│                                                    Summaries   │
│                                                    PDFs        │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| **Backend** | Supabase (PostgreSQL, Edge Functions, Real-time, Storage) |
| **Real-time Audio** | LiveKit Agent for transcription |
| **AI/ML** | OpenAI GPT-4 for clinical analysis, field extraction, note generation |
| **PDF Generation** | Custom PDF stream builder |
| **Auth** | Supabase Auth with role-based access (Nurse/Doctor) |

### Key Features Deep Dive

**🔄 Real-Time Updates**
- Supabase Realtime subscriptions push updates instantly across all panels
- Transcript, Clinical Fields, Draft Notes, and Referrals update live as the conversation progresses

**🧪 Smart Clinical Analysis**
- AI analyzes transcripts to suggest possible conditions (differential diagnosis)
- Generates contextual follow-up questions based on patient responses
- Identifies red flags and safety alerts requiring immediate attention

**📝 EHR Template Integration**
- Upload existing EHR templates (PDF, DOCX, or plain text)
- Define custom fields for your specific workflow
- AI generates intake questions based on template requirements

**💰 Automated Medical Coding**
- ICD-10 diagnosis codes extracted from clinical context
- CPT procedure codes suggested based on documented services
- Confidence scores for billing review

---

## 🚧 Challenges We Faced

1. **Real-time Synchronization** — Coordinating live transcription, AI processing, and UI updates required careful state management and debouncing strategies

2. **Healthcare Compliance** — Ensuring all AI outputs are appropriately labeled as "DRAFT" and include disclaimers to prevent misuse as definitive medical advice

3. **PDF Generation** — Building a custom PDF generator that handles multi-page documents with proper formatting, headers, and structured medical data

4. **Demo Mode Auth** — Creating a seamless demo experience while maintaining proper UUID validation for database operations

---

## 🏆 Accomplishments

- **Zero to Production** — Built a full-stack healthcare platform in a hackathon timeframe
- **Real-time Everything** — True ambient documentation with live updates across 6+ panels
- **Compliance-First** — Healthcare-safe AI outputs with proper disclaimers and draft labels
- **Role-Based Workflows** — Complete nurse-to-doctor handoff workflow with billing integration

---

## 📚 What We Learned

- The importance of **prompt engineering** for healthcare-specific AI outputs
- Building **real-time systems** with Supabase subscriptions and LiveKit
- Healthcare **compliance requirements** and how to build responsible AI tools
- Creating **intuitive UX** for high-pressure clinical environments

---

## 🚀 What's Next

- [ ] **Voice Commands** — Hands-free operation during procedures
- [ ] **Multi-language Support** — Transcription and documentation in multiple languages
- [ ] **EHR Integrations** — Direct export to Epic, Cerner, and other major EHR systems
- [ ] **Mobile App** — iOS/Android companion for bedside documentation
- [ ] **Analytics Dashboard** — Practice-wide insights on documentation efficiency
- [ ] **HIPAA Certification** — Full compliance audit and certification

---

## 🏃 Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase CLI
- Docker (for local Supabase)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-team/echo-health.git
cd echo-health

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in your API keys (Supabase, OpenAI, LiveKit)

# Start Supabase locally
pnpm supabase:start

# Run database migrations
pnpm supabase:reset

# Start the development server
pnpm dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# LiveKit
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
NEXT_PUBLIC_LIVEKIT_URL=your_livekit_url
```

---

## 📁 Project Structure

```
echo-health/
├── apps/
│   └── web/                    # Next.js frontend
│       ├── app/                # App router pages
│       │   ├── encounter/      # Patient encounter flow
│       │   ├── dashboard/      # Nurse dashboard
│       │   ├── doctor/         # Doctor portal
│       │   └── templates/      # EHR template management
│       ├── components/         # React components
│       └── lib/                # Utilities & API
├── supabase/
│   ├── functions/              # Edge Functions
│   │   ├── start-encounter/
│   │   ├── upsert-transcript/
│   │   ├── extract-fields/
│   │   ├── generate-draft-note/
│   │   ├── generate-summary/
│   │   ├── generate-diagnosis/
│   │   ├── smart-clinical-analysis/
│   │   ├── generate-live-questions/
│   │   ├── generate-referral-pdf/
│   │   ├── generate-pdf/
│   │   └── _shared/            # Shared utilities
│   └── migrations/             # Database schema
└── livekit-agent/              # Audio transcription agent
```

---

## 🤝 Team

Built with ❤️ for **NexHacks** by our team passionate about improving healthcare through technology.

---

## ⚠️ Compliance Notice

Echo Health is designed with healthcare compliance in mind:

- All AI-generated clinical content is labeled as **DRAFT**
- No definitive diagnoses or treatment recommendations
- Patient-facing content includes **"Not medical advice"** disclaimers
- Role-based access controls for sensitive data

*This is a hackathon prototype. Production deployment would require HIPAA compliance audit, BAA agreements, and proper security certifications.*

---

## 📄 License

Private — All rights reserved

---

<p align="center">
  <strong>Echo Health</strong> — Because clinicians should focus on patients, not paperwork.
</p>

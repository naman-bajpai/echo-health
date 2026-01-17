# Echo Health
Nexhacks

A healthcare encounter management system with real-time transcription, AI-powered field extraction, and compliant documentation generation.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Real-time**: LiveKit (transcription)
- **AI**: OpenAI GPT-4 (field extraction, summarization)
- **Integrations**: Browserbase (web scraping), ElevenLabs (TTS), Arize (observability)

## Project Structure

```
echo-health/
├── apps/
│   └── web/                 # Next.js frontend
├── supabase/
│   ├── config.toml
│   ├── migrations/          # Database schema
│   └── functions/           # Edge Functions
│       └── _shared/         # Shared utilities
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase CLI
- Docker (for local Supabase)

### Installation

```bash
# Install dependencies
pnpm install

# Start Supabase locally
pnpm supabase:start

# Run database migrations
pnpm supabase:reset

# Start the frontend
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Supabase Edge Functions

```bash
# Serve functions locally
pnpm supabase:functions

# Deploy functions
pnpm supabase:deploy
```

## Features

1. **Encounter Management** - Patient visit workflow (intake → visit → checkout)
2. **Real-time Transcription** - LiveKit-based audio transcription
3. **Field Extraction** - Extract patient info from transcripts (non-diagnostic)
4. **Draft Note Generation** - SOAP notes (without diagnosis)
5. **Referral Search** - Provider directory search
6. **Summary Generation** - Patient-facing summaries
7. **PDF Generation** - Downloadable summaries
8. **Audio Narration** - TTS for explanations

## Compliance

This system enforces healthcare compliance:

- **No diagnosis language** in generated content
- **No treatment advice** or medication instructions
- All clinician-facing outputs labeled **DRAFT**
- Patient summaries include **"Not medical advice"** disclaimer

## License

Private - All rights reserved

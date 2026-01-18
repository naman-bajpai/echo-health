# Real-time Notes Implementation for Echo Health

This document describes the implementation of real-time note generation in Echo Health, based on the note-taking-assistant approach.

## Overview

The implementation adds real-time medical note generation to Echo Health encounters, similar to the note-taking-assistant demo. As conversations are transcribed, an AI agent automatically generates structured medical notes that update in real-time on the frontend.

## Architecture

### Backend Agent (`livekit-agent/agent.py`)

The agent has been updated to use the LiveKit agents framework with the following features:

1. **Voice Agent Setup**: Uses `Agent` and `AgentSession` from `livekit.agents.voice`
2. **Speech-to-Text**: Uses Deepgram STTv2 with eager end-of-turn threshold (0.5)
3. **Real-time Note Generation**: 
   - Accumulates transcriptions as they come in
   - Sends full transcript to LLM (OpenAI or Cerebras) for note generation
   - Updates notes incrementally as new transcriptions arrive
4. **RPC Communication**: Uses LiveKit RPC to send notes and transcriptions to the frontend

### Key Components

#### `EchoHealthAssistant` Class

- Manages transcriptions and note generation
- Maintains a running transcript
- Generates structured medical notes using LLM
- Sends updates to frontend via RPC

#### RPC Methods

- `receive_notes`: Sends complete medical notes to frontend
- `receive_transcription`: Sends recent transcription snippets for live display

### Frontend Components

#### `RealtimeNotesPanel.tsx`

A new component that displays:
- Recent transcription preview (last 3 sentences)
- Structured medical notes (auto-updating)
- Word count and status indicators

#### Updated `TranscriptPanel.tsx`

- Registers RPC handlers to receive notes and transcriptions
- Emits custom events to communicate with `RealtimeNotesPanel`
- Maintains backward compatibility with existing data message approach

#### Updated Encounter Page

- Shows transcript and real-time notes side-by-side in transcript mode
- Split view layout for better UX

## Configuration

### Environment Variables

The agent supports the following environment variables:

```bash
# LLM Configuration
LLM_PROVIDER=openai  # or "cerebras"
OPENAI_MODEL=gpt-4o-mini  # Default OpenAI model
CEREBRAS_MODEL=gpt-oss-120b  # Cerebras model if using Cerebras

# Langfuse (optional, for telemetry)
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...
LANGFUSE_HOST=...
```

### Dependencies

Updated `requirements.txt` to include:
```
livekit-agents[deepgram,silero,openai]>=1.2.0,<1.3.0
python-dotenv>=1.0.0
```

## How It Works

1. **Connection**: User connects to LiveKit room from the frontend
2. **Transcription**: Agent transcribes audio using Deepgram STT
3. **Note Generation**: 
   - When final transcriptions arrive, they're added to the full transcript
   - The full transcript is sent to the LLM with instructions to generate structured medical notes
   - Notes are updated incrementally (not regenerated from scratch each time)
4. **RPC Updates**: 
   - Agent sends notes via RPC to frontend
   - Frontend receives and displays notes in real-time
5. **Live Display**: Recent transcriptions are shown in a preview panel

## Differences from Note-Taking-Assistant

1. **LLM Provider**: Supports both OpenAI (default) and Cerebras, configurable via env vars
2. **Integration**: Integrated into existing Echo Health UI structure rather than standalone
3. **Event Communication**: Uses custom events between components in addition to RPC
4. **Medical Focus**: Prompt tuned specifically for medical encounters and SOAP note format

## Usage

1. Start the agent:
   ```bash
   cd livekit-agent
   python agent.py dev
   ```

2. In the Echo Health frontend:
   - Navigate to an encounter
   - Click "Start Transcribing" in the Transcript panel
   - Real-time notes will appear in the right panel automatically

## Notes

- Notes are generated incrementally to maintain context
- The agent only adds information explicitly mentioned in transcriptions
- Notes follow medical documentation standards (SOAP format)
- All notes are draft and should be reviewed before finalizing

## Future Enhancements

- Add ability to save notes directly to encounter
- Support for multiple note formats (SOAP, H&P, etc.)
- Integration with existing draft note generation
- Speaker identification in notes
- Note editing capabilities

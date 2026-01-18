# Echo Health LiveKit Agent

Real-time transcription agent for healthcare encounters.

## Setup

### 1. Create Virtual Environment

**Important:** LiveKit Agents requires Python >=3.10, <3.14. Python 3.14+ is not supported.

```bash
cd livekit-agent

# If you have Python 3.13 installed (recommended)
python3.13 -m venv venv

# OR if you only have Python 3.12
python3.12 -m venv venv

# Activate the virtual environment
source venv/bin/activate
```

If you don't have Python 3.13, install it:
```bash
brew install python@3.13
```

### 2. Install Dependencies

```bash
# Make sure venv is activated (you should see (venv) in your prompt)
pip install -r requirements.txt
```

### 3. Set Environment Variables

The agent will automatically get LiveKit credentials from LiveKit Cloud when deployed.

For local testing, create `.env`:
```bash
cp .env.example .env
# Edit .env with your keys
```

### 4. Get Deepgram API Key

1. Sign up at https://deepgram.com/
2. Get your API key from dashboard
3. Set it in `.env` or as environment variable:
```bash
export DEEPGRAM_API_KEY=your-key
```

### 4. Test Locally

```bash
python agent.py dev
```

### 5. Deploy to LiveKit Cloud

```bash
# Make sure you're authenticated
lk cloud auth

# Deploy the agent
lk agent create
```

This will:
- Create a Dockerfile
- Build and deploy to LiveKit Cloud
- Register the agent with your project

## How It Works

1. Agent joins the LiveKit room when a participant connects
2. Listens to audio tracks from participants
3. Transcribes speech using Deepgram STT
4. Sends transcription events back to the room via data messages
5. Frontend receives these events and displays them

## Troubleshooting

### Agent not transcribing
- Check Deepgram API key is set
- Verify agent is deployed and running in LiveKit Cloud dashboard
- Check agent logs in LiveKit Cloud

### No transcription in frontend
- Verify frontend is listening for `RoomEvent.DataReceived`
- Check that data messages have `type: "transcription"`

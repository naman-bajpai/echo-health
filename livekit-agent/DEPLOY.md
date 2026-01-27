# Deploy LiveKit Agent - Step by Step

## Prerequisites

1. LiveKit CLI installed: `brew install livekit-cli`
2. Authenticated: `lk cloud auth`
3. Deepgram API key (get from https://deepgram.com/)

## Step 1: Install Dependencies

```bash
cd livekit-agent

# Using pip
pip install -r requirements.txt

# OR using uv (recommended)
uv pip install -r requirements.txt
```

## Step 2: Set Deepgram API Key

```bash
# Set as environment variable
export DEEPGRAM_API_KEY=your-deepgram-key

# OR add to .env file
echo "DEEPGRAM_API_KEY=your-deepgram-key" >> .env
```

## Step 3: Test Locally (Optional)

```bash
python agent.py dev
```

## Step 4: Deploy to LiveKit Cloud

From the `livekit-agent` directory:

1. **Set default project** (if you have multiple projects):
   ```bash
   lk project set-default echo-health
   ```

2. **Create or deploy**:
   ```bash
   lk agent create   # first-time only
   # or
   lk agent deploy   # redeploy existing agent
   ```

This will:
1. Create `Dockerfile` (if not exists)
2. Create `livekit.toml` config
3. Build Docker image
4. Deploy to LiveKit Cloud
5. Register agent with your project

## Step 5: Verify Deployment

1. Go to LiveKit Cloud Dashboard
2. Navigate to **Agents** section
3. You should see your agent listed and running

## Step 6: Test the Agent

1. Start your Next.js app
2. Create a new encounter
3. Click "Start Transcribing"
4. Speak - you should see transcription appearing

## Troubleshooting

### Agent not deploying
- Check you're in the `livekit-agent` directory
- Verify `lk cloud auth` worked (run it, complete browser flow, pick the correct project)
- Set default project: `lk project set-default echo-health` (use your project name from `lk project list`)
- **401 "unable to get client settings"**: Upgrade CLI (`brew update && brew upgrade livekit-cli`), then run `lk cloud auth` again and pick the project that matches your LiveKit URL (`echo-health-a3cjlckg`). Ensure you're signed into the correct LiveKit Cloud team in the browser.
- Check Docker is running (if building locally)

### No transcription
- Verify Deepgram API key is set
- Check agent logs in LiveKit Cloud dashboard
- Ensure agent is running (status should be "active")

### Frontend not receiving transcription
- Check browser console for errors
- Verify `NEXT_PUBLIC_LIVEKIT_URL` is set correctly
- Check that data messages are being sent (Network tab)

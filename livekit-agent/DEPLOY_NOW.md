# Deploy Agent NOW - Quick Steps

## 1. Make sure you're in the right directory
```bash
cd "/Users/kise/Desktop/Nexhacks/Echo Health/livekit-agent"
```

## 2. Activate virtual environment
```bash
source venv/bin/activate
```

## 3. Set Deepgram API key
```bash
export DEEPGRAM_API_KEY=abb66167443e7426c7db77fe829096f0b45e97bd
```

## 4. Deploy the agent
```bash
lk agent create
```

This will:
- Build the Docker image
- Deploy to LiveKit Cloud
- Register with your project

## 5. Verify deployment
```bash
lk agent list
```

You should see your agent listed as "Active"

## 6. Check logs (if needed)
```bash
lk agent logs <agent-name>
```

## After Deployment

1. Go back to your Next.js app
2. Create a new encounter
3. Click "Start Transcribing"
4. You should see "Agent connected and ready for transcription" message
5. Speak - transcription should appear and be saved automatically

## Troubleshooting

**Agent not showing up?**
- Make sure `lk cloud auth` worked
- Check you're in the right project

**No transcription?**
- Check agent logs: `lk agent logs <agent-name>`
- Verify Deepgram API key is set
- Make sure microphone permissions are granted in browser

**Connection but no data?**
- Check browser console for errors
- Verify agent is "Active" in LiveKit Cloud dashboard

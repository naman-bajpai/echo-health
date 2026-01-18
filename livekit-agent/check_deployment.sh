#!/bin/bash

echo "🔍 Checking LiveKit Agent Deployment..."
echo ""

# Check if lk CLI is installed
if ! command -v lk &> /dev/null; then
    echo "❌ LiveKit CLI not found. Install with: brew install livekit-cli"
    exit 1
fi

echo "✅ LiveKit CLI installed"

# Check if authenticated
echo ""
echo "📋 Listing agents..."
lk agent list

echo ""
echo "💡 If no agents are listed, deploy with:"
echo "   cd livekit-agent"
echo "   source venv/bin/activate"
echo "   export DEEPGRAM_API_KEY=your-key"
echo "   lk agent create"

#!/bin/bash

echo "🧪 Echo Health - Quick Test Script"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Supabase secrets
echo "1️⃣  Checking Supabase secrets..."
if npx supabase secrets list | grep -q "ANTHROPIC_API_KEY"; then
    echo -e "${GREEN}✅ ANTHROPIC_API_KEY found${NC}"
else
    echo -e "${RED}❌ ANTHROPIC_API_KEY missing${NC}"
    echo "   Run: npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-..."
fi

if npx supabase secrets list | grep -q "OPENAI_API_KEY"; then
    echo -e "${GREEN}✅ OPENAI_API_KEY found${NC}"
else
    echo -e "${RED}❌ OPENAI_API_KEY missing${NC}"
fi

if npx supabase secrets list | grep -q "LIVEKIT_URL"; then
    echo -e "${GREEN}✅ LIVEKIT_URL found${NC}"
else
    echo -e "${RED}❌ LIVEKIT_URL missing${NC}"
fi

echo ""

# Check 2: Frontend env
echo "2️⃣  Checking frontend environment..."
if [ -f "apps/web/.env.local" ]; then
    if grep -q "NEXT_PUBLIC_LIVEKIT_URL" apps/web/.env.local; then
        echo -e "${GREEN}✅ NEXT_PUBLIC_LIVEKIT_URL found${NC}"
    else
        echo -e "${YELLOW}⚠️  NEXT_PUBLIC_LIVEKIT_URL missing in .env.local${NC}"
    fi
else
    echo -e "${RED}❌ apps/web/.env.local not found${NC}"
fi

echo ""

# Check 3: LiveKit agent
echo "3️⃣  Checking LiveKit agent..."
if command -v lk &> /dev/null; then
    AGENT_COUNT=$(lk agent list 2>/dev/null | grep -c "│" || echo "0")
    if [ "$AGENT_COUNT" -gt "2" ]; then
        echo -e "${GREEN}✅ LiveKit agent is deployed${NC}"
        echo "   Agent ID: $(lk agent list 2>/dev/null | grep -E '^│ [A-Z]' | head -1 | awk '{print $2}')"
    else
        echo -e "${YELLOW}⚠️  LiveKit agent not found${NC}"
        echo "   Run: cd livekit-agent && lk agent create"
    fi
else
    echo -e "${RED}❌ LiveKit CLI not installed${NC}"
    echo "   Run: brew install livekit-cli"
fi

echo ""

# Check 4: Node modules
echo "4️⃣  Checking dependencies..."
if [ -d "apps/web/node_modules" ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend dependencies not installed${NC}"
    echo "   Run: cd apps/web && npm install"
fi

echo ""

# Summary
echo "=================================="
echo "📋 Test Summary:"
echo ""
echo "Next steps:"
echo "1. Start frontend: cd apps/web && npm run dev"
echo "2. Open: http://localhost:3000"
echo "3. Follow the testing guide: TESTING_GUIDE.md"
echo ""
echo "Quick test flow:"
echo "  → Create encounter"
echo "  → Start transcribing (speak 2-3 sentences)"
echo "  → Click 'Analyze with AI'"
echo "  → Check Fields tab for extracted data"
echo "  → Generate SOAP note"
echo ""

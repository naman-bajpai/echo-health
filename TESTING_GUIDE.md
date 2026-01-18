# Complete Testing Guide for Echo Health

## Prerequisites Check

### 1. Verify All Services Are Running

```bash
# Check Supabase secrets
npx supabase secrets list

# Should show:
# - LIVEKIT_URL
# - LIVEKIT_API_KEY
# - LIVEKIT_API_SECRET
# - ANTHROPIC_API_KEY
# - OPENAI_API_KEY
```

### 2. Verify LiveKit Agent is Deployed

```bash
cd livekit-agent
lk agent list
# Should show your agent as "Active"
```

### 3. Check Frontend Environment

```bash
cd apps/web
cat .env.local

# Should have:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_LIVEKIT_URL
```

---

## Complete End-to-End Test

### Step 1: Start the Frontend

```bash
cd apps/web
npm run dev
```

Open http://localhost:3000

**Expected:**
- ✅ Landing page loads
- ✅ Can select role (Nurse/Doctor)
- ✅ Can enter name
- ✅ "Enter Dashboard" button works

---

### Step 2: Create a New Encounter

1. Click "New Encounter" or go to `/new-encounter`
2. **Test Patient Search:**
   - Type a name in search box
   - Should see existing patients (if any)
   - OR click "Create New Patient"

3. **Create New Patient:**
   - Fill in: Name, DOB, Phone, Email
   - Click "Create Patient & Continue"
   - Should see patient card with visit number

4. **Enter Reason for Visit:**
   - Type: "Annual checkup" or "Chest pain and shortness of breath"
   - Click "Start Encounter"
   - Should redirect to `/encounter/[id]`

**Expected:**
- ✅ Patient created successfully
- ✅ Visit number shows correctly (1st visit, 2nd visit, etc.)
- ✅ Encounter page loads

---

### Step 3: Test Live Transcription

1. **On Encounter Page:**
   - Should see "Live Transcript" tab selected
   - Click "Start Transcribing" button

2. **Check Browser Console:**
   ```
   ✅ Should see:
   - "🔌 Connecting to LiveKit..."
   - "✅ Connected to LiveKit room: encounter-xxx"
   - "🎙️ Enabling microphone..."
   - "✅ Microphone enabled"
   - "📨 Data received from agent: {type: 'transcription', ...}"
   ```

3. **Grant Microphone Permission:**
   - Browser will ask for microphone access
   - Click "Allow"

4. **Speak Test Phrases:**
   - Say: "Hello, I'm experiencing chest pain"
   - Say: "It started about 2 hours ago"
   - Say: "The pain is severe, about 8 out of 10"

**Expected:**
- ✅ LiveKit connects successfully
- ✅ Transcription appears in real-time
- ✅ Each sentence is saved automatically
- ✅ Transcript shows in the panel with speaker labels

**Check Database:**
```bash
# In Supabase Dashboard → Table Editor → transcript_chunks
# Should see new rows appearing as you speak
```

---

### Step 4: Test AI Analysis

1. **After speaking for 30-60 seconds:**
   - Click "Analyze with AI" button (top right)
   - Should show "Analyzing..." then "Re-Analyze"

2. **Check Browser Console:**
   ```
   ✅ Should see:
   - "Using Claude model: claude-3-5-sonnet-20241022"
   - Analysis response with symptoms, urgency, etc.
   ```

3. **Verify Results:**
   - Go to "Fields" tab
   - Should see:
     - ✅ Patient name (pre-filled from encounter)
     - ✅ DOB (pre-filled)
     - ✅ Reason for visit (pre-filled)
     - ✅ Symptoms extracted (from your speech)
     - ✅ Medications mentioned
     - ✅ Allergies mentioned

**Expected:**
- ✅ Analysis completes in 5-10 seconds
- ✅ Fields are populated with extracted data
- ✅ Urgency assessment appears (if red flags detected)

---

### Step 5: Test Urgency Assessment

**If you mentioned concerning symptoms:**
- Should see urgency banner at top
- Red flags should be listed
- Specialist recommendation (if needed)

**Test with different scenarios:**

**Scenario A - Routine:**
- Say: "I need a routine checkup"
- Expected: Urgency = "routine"

**Scenario B - Urgent:**
- Say: "I have severe chest pain and can't breathe"
- Expected: Urgency = "urgent" or "emergent", red flags shown

---

### Step 6: Test SOAP Note Generation

1. **Go to "Note" tab**
2. **Click "Generate Note"**
3. **Wait for generation** (10-15 seconds)

**Expected:**
- ✅ SOAP note appears with:
  - **Subjective:** Patient's reported symptoms
  - **Objective:** Clinical findings mentioned
  - **Assessment:** Clinical impression (marked as DRAFT)
  - **Plan:** Treatment recommendations (marked as DRAFT)
- ✅ Draft warning banner at top
- ✅ Professional medical terminology

**If empty/fallback:**
- Check: `ANTHROPIC_API_KEY` is set in Supabase secrets
- Check: Claude API key is valid
- Check: Browser console for errors

---

### Step 7: Test Patient Summary

1. **Go to "Summary" tab**
2. **Click "Generate Summary"**
3. **Wait for generation** (10-15 seconds)

**Expected:**
- ✅ Patient-friendly summary appears
- ✅ Visit summary paragraph
- ✅ Diagnoses (if any)
- ✅ Treatment plan
- ✅ Medications
- ✅ Patient instructions
- ✅ Warning signs to watch for

---

### Step 8: Test PDF Generation

1. **On Summary tab**
2. **Click "Download PDF"**
3. **PDF should download**

**Expected:**
- ✅ PDF file downloads
- ✅ Contains all summary information
- ✅ Professional formatting
- ✅ Patient name and date

---

### Step 9: Test Referral Search

1. **Go to "Referral" tab**
2. **If specialist was recommended:**
   - Should see pre-filled search
3. **OR manually search:**
   - Type: "Cardiologist" or "Neurologist"
   - Enter location (optional)
   - Click "Search"

**Expected:**
- ✅ List of providers appears
- ✅ Shows: Name, Specialty, Address, Phone
- ✅ Can click "Approve Referral"

---

### Step 10: Test Real-time Updates

1. **Open encounter in two browser windows**
2. **In Window 1:** Add transcript
3. **In Window 2:** Should see transcript appear automatically

**Expected:**
- ✅ Real-time sync works
- ✅ No page refresh needed

---

## Quick Smoke Test (5 minutes)

For a quick test of core functionality:

1. ✅ **Landing page loads**
2. ✅ **Create encounter** → Patient + Reason
3. ✅ **Start transcribing** → Speak 2-3 sentences
4. ✅ **Click "Analyze with AI"** → Wait for results
5. ✅ **Check Fields tab** → Should see extracted data
6. ✅ **Generate SOAP note** → Should see draft note

If all 6 pass → Core functionality works! ✅

---

## Common Issues & Fixes

### Issue: "LiveKit Not Configured"
**Fix:**
```bash
# Check .env.local has:
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### Issue: "No transcription appearing"
**Fix:**
1. Check agent is deployed: `lk agent list`
2. Check browser console for errors
3. Verify microphone permission granted
4. Check agent logs: `lk agent logs <agent-name>`

### Issue: "SOAP note is empty/fallback"
**Fix:**
```bash
# Set Anthropic key:
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-xxx

# Redeploy:
npx supabase functions deploy generate-draft-note --legacy-bundle
```

### Issue: "Extract Fields shows 'No transcript found'"
**Fix:**
- Make sure you've spoken and transcription was saved
- Check `transcript_chunks` table in Supabase
- Try "Analyze with AI" instead (it gets all transcripts)

### Issue: "Agent not connecting"
**Fix:**
1. Verify agent is deployed and active
2. Check LiveKit credentials in Supabase secrets
3. Check browser console for connection errors
4. Try creating a new encounter (new room)

---

## Performance Benchmarks

**Expected Timings:**
- Transcription: Real-time (appears as you speak)
- AI Analysis: 5-10 seconds
- SOAP Note: 10-15 seconds
- Summary: 10-15 seconds
- PDF Generation: 2-5 seconds

If slower, check:
- API key limits/quotas
- Network connection
- Supabase function logs

---

## Testing Checklist

- [ ] Landing page loads
- [ ] Can create new patient
- [ ] Can start encounter
- [ ] LiveKit connects
- [ ] Transcription works (speech → text)
- [ ] Transcripts saved to database
- [ ] AI Analysis extracts fields
- [ ] Urgency assessment works
- [ ] SOAP note generates
- [ ] Summary generates
- [ ] PDF downloads
- [ ] Referral search works
- [ ] Real-time updates work
- [ ] Fields are editable
- [ ] All tabs switch correctly

---

## Debug Mode

**Enable verbose logging:**

1. **Browser Console:**
   - Already has detailed logs
   - Look for: 📝, 💾, ✅, ❌ emojis

2. **Supabase Function Logs:**
   ```bash
   # In Supabase Dashboard:
   # Edge Functions → Select function → Logs
   ```

3. **LiveKit Agent Logs:**
   ```bash
   lk agent logs <agent-name>
   ```

4. **Network Tab:**
   - Open DevTools → Network
   - Filter by "supabase" or "livekit"
   - Check request/response details

---

## Success Criteria

Your app is working correctly if:

✅ **Transcription:** Speech → Text appears in real-time  
✅ **Analysis:** AI extracts symptoms, meds, allergies  
✅ **Urgency:** Red flags detected and displayed  
✅ **SOAP:** Professional draft note generated  
✅ **Summary:** Patient-friendly summary created  
✅ **PDF:** Downloadable document works  
✅ **Real-time:** Updates sync across tabs  

If all ✅ → **Your app is production-ready!** 🎉

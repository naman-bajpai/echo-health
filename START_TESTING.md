# 🚀 Start Testing Your App - Final Checklist

## ✅ Pre-Flight Check (All Good!)

Your setup looks perfect:
- ✅ **Supabase Secrets:** All API keys configured
- ✅ **Frontend Env:** LiveKit URL set
- ✅ **LiveKit Agent:** Deployed (ID: CA_aiEEwtDRd7A9)
- ✅ **Dependencies:** Installed

---

## 🎯 Start Testing NOW

### Step 1: Start Frontend Server

```bash
cd apps/web
npm run dev
```

**Expected:** Server starts on http://localhost:3000

---

### Step 2: Open Browser

1. Go to: **http://localhost:3000**
2. Open **Developer Console** (F12 or Cmd+Option+I)
3. Keep console open to see debug logs

---

### Step 3: Complete Test Flow

#### A. Landing Page
- [ ] Page loads
- [ ] Select role: **Doctor** or **Nurse**
- [ ] Enter your name
- [ ] Click **"Enter Dashboard"**

#### B. Create Encounter
- Click **"New Encounter"** or "+" button
- [ ] **Create New Patient:**
  - Name: "John Doe"
  - DOB: Any date
  - Phone: "555-1234"
  - Click **"Create Patient & Continue"**
- [ ] **Enter Reason:**
  - Type: **"Severe chest pain and difficulty breathing"**
  - Click **"Start Encounter"**

#### C. Test Live Transcription
- [ ] Encounter page loads
- [ ] Click **"Start Transcribing"** button
- [ ] **Grant microphone permission** when browser asks
- [ ] **Check console** - should see:
  ```
  ✅ Connected to LiveKit room: encounter-xxx
  ✅ Microphone enabled
  📨 Data received from agent
  ```
- [ ] **Speak clearly:**
  - "I'm experiencing severe chest pain"
  - "It started about 2 hours ago"
  - "The pain is about 8 out of 10"
  - "I also feel short of breath"
- [ ] **Watch transcript panel:**
  - [ ] Text appears in real-time
  - [ ] Shows speaker labels (Staff/Patient)
  - [ ] Each sentence saved automatically

#### D. Test AI Analysis
- [ ] Click **"Analyze with AI"** button (top right, purple)
- [ ] Wait 5-10 seconds
- [ ] **Check console:**
  ```
  Using Claude model: claude-3-5-sonnet-20241022
  Analysis saved successfully
  ```
- [ ] **Go to "Fields" tab:**
  - [ ] Patient name (pre-filled)
  - [ ] DOB (pre-filled)
  - [ ] Reason for visit (pre-filled)
  - [ ] **Symptoms extracted:** "chest pain", "shortness of breath"
  - [ ] **Urgency indicators:** Red flags detected

#### E. Test Urgency Assessment
- [ ] **Check top of page:**
  - [ ] Should see urgency banner (red/amber/green)
  - [ ] Shows: "Clinical Red Flags Detected"
  - [ ] Lists: "chest pain", "difficulty breathing"
  - [ ] Urgency level: **"urgent"** or **"emergent"**

#### F. Test SOAP Note
- [ ] Go to **"Note"** tab
- [ ] Click **"Generate Note"**
- [ ] Wait 10-15 seconds
- [ ] **Should see:**
  - [ ] **Subjective:** Patient's reported symptoms
  - [ ] **Objective:** Clinical findings
  - [ ] **Assessment:** Clinical impression (marked DRAFT)
  - [ ] **Plan:** Treatment recommendations (marked DRAFT)
- [ ] **If empty/fallback:** Check ANTHROPIC_API_KEY

#### G. Test Summary
- [ ] Go to **"Summary"** tab
- [ ] Click **"Generate Summary"**
- [ ] Wait 10-15 seconds
- [ ] **Should see:**
  - [ ] Visit summary paragraph
  - [ ] Diagnoses (if any)
  - [ ] Treatment plan
  - [ ] Medications
  - [ ] Patient instructions
  - [ ] Warning signs
- [ ] Click **"Download PDF"**
  - [ ] PDF downloads
  - [ ] Contains all summary info

#### H. Test Referral (Optional)
- [ ] Go to **"Referral"** tab
- [ ] Should see pre-filled specialist (Cardiologist)
- [ ] Click **"Search"**
- [ ] Providers list appears

---

## 🔍 What to Watch For

### ✅ Success Indicators

**In Browser Console:**
- `✅ Connected to LiveKit room`
- `📨 Data received from agent`
- `💾 Sending transcript to server`
- `✅ Transcript saved successfully`
- `Using Claude model: claude-3-5-sonnet-20241022`

**In UI:**
- Green "LiveKit Connected" badge
- Transcription appears as you speak
- Fields populate after "Analyze with AI"
- Urgency banner shows (if red flags)
- SOAP note has content (not empty)

### ❌ Common Issues

**No transcription:**
- Check microphone permission granted
- Check agent is deployed: `lk agent list`
- Check console for connection errors

**Empty SOAP note:**
- Check: `npx supabase secrets list | grep ANTHROPIC`
- Redeploy: `npx supabase functions deploy generate-draft-note --legacy-bundle`

**"No transcript found":**
- Make sure you spoke and transcription appeared
- Try "Analyze with AI" instead of "Extract Fields"

---

## 📊 Expected Results

After speaking about chest pain:

**Fields Tab Should Show:**
- Symptoms: ["chest pain", "shortness of breath"]
- Urgency: "urgent" or "emergent"
- Red flags: ["chest pain", "difficulty breathing"]

**SOAP Note Should Have:**
- Subjective: "Patient reports severe chest pain..."
- Assessment: "[DRAFT] Possible cardiac event..."

**Summary Should Include:**
- "Patient presented with chest pain and shortness of breath"
- Warning signs: "Seek immediate medical attention if..."

---

## 🎉 Success!

If all steps pass → **Your app is working perfectly!**

You've successfully tested:
- ✅ Real-time transcription (LiveKit)
- ✅ AI-powered field extraction (Claude)
- ✅ Urgency assessment
- ✅ SOAP note generation
- ✅ Patient summary
- ✅ PDF download

**Ready for your hackathon demo!** 🚀

---

## 🐛 Still Having Issues?

1. **Check browser console** for specific errors
2. **Check Supabase logs:** Dashboard → Edge Functions → Logs
3. **Check agent status:** `lk agent list`
4. **See TESTING_GUIDE.md** for detailed troubleshooting

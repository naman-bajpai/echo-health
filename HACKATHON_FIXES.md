# 🚨 Hackathon Quick Fixes - 2 Hours Left

## ✅ COMPLETED
- ✅ Created Toast component for user feedback
- ✅ Created useToast hook

## 🔴 CRITICAL - Fix These NOW (30 min)

### 1. Replace `alert()` with Toast (5 min each)
**Files to fix:**
- `apps/web/app/encounter/[encounterId]/checkout/page.tsx:110` - Replace alert with toast
- `apps/web/app/patients/[patientId]/page.tsx:169` - Replace alert with toast  
- `apps/web/app/profile/page.tsx:79` - Replace alert with toast
- `apps/web/components/DoctorAssignmentPanel.tsx:41,48` - Replace alerts with toast

**How to fix:**
```tsx
// Add at top
import { useToast } from "@/hooks/useToast";
const { showError, showSuccess } = useToast();

// Replace alert("message") with:
showError("message");
// or
showSuccess("message");
```

### 2. Add Toast Container to Root Layout (2 min)
**File:** `apps/web/app/layout.tsx`

Add ToastContainer to show toasts globally:
```tsx
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

// In RootLayout component, add ToastContainer
// (You'll need to make it a client component or create a ToastProvider)
```

### 3. Add Error Display in Encounter Page (10 min)
**File:** `apps/web/app/encounter/[encounterId]/page.tsx`

Add error state display for failed operations:
- Show error toast when `handleAnalyze` fails
- Show error toast when `handleGenerateAll` fails
- Show error toast when urgency update fails

## 🟡 IMPORTANT - Do These Next (45 min)

### 4. Add Error Handling to API Calls (15 min)
Wrap these in try/catch with user feedback:
- `generateBillingCodes` - Show error if fails
- `generateReferralPdf` - Show error if fails  
- `updateFields` - Show error if fails

### 5. Add Loading States (10 min)
- Checkout page: Show loading spinner during billing code generation
- Doctor dashboard: Show skeleton loader during encounter fetch
- Templates page: Show loading during delete operation

### 6. Add Empty States (10 min)
- Doctor dashboard: "No encounters found" message
- Analytics page: "No data for selected period" message

### 7. Add Success Messages (10 min)
After successful operations, show success toast:
- "Patient saved successfully"
- "Encounter completed"
- "Template uploaded successfully"
- "Billing codes generated"

## 🟢 NICE TO HAVE (if time permits)

### 8. Add Toast Animations to globals.css
```css
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
```

### 9. Network Error Handling
- Show "Connection lost" message
- Add retry buttons for failed operations

### 10. Form Validation Feedback
- Show inline errors on blur
- Disable submit until valid

## 📝 Quick Implementation Guide

### Step 1: Add Toast to Layout (5 min)
1. Create `ToastProvider.tsx` component
2. Wrap app with ToastProvider
3. Add ToastContainer to layout

### Step 2: Replace All Alerts (15 min)
1. Find all `alert()` calls: `grep -r "alert(" apps/web`
2. Replace with `showError()` or `showSuccess()`
3. Test each replacement

### Step 3: Add Error Handling (10 min)
1. Wrap API calls in try/catch
2. Show error toast on failure
3. Show success toast on success

## 🎯 Priority Order
1. ✅ Toast component (DONE)
2. 🔴 Replace alerts (30 min)
3. 🔴 Add error display (10 min)
4. 🟡 Add loading states (10 min)
5. 🟡 Add success messages (10 min)
6. 🟡 Add empty states (10 min)

## 💡 Pro Tips
- Use `console.log` to debug, but show user-friendly messages in UI
- Test error scenarios (disconnect network, invalid input)
- Keep error messages clear and actionable
- Success messages should be brief and positive

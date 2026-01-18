"use client";

import { useState, useEffect } from "react";
import { FileText, Save, Send, Download, X, Edit2, Check } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface ReferralPdfContent {
  patient_name: string;
  patient_dob?: string;
  patient_mrn?: string;
  referring_provider: string;
  specialist_type: string;
  chief_complaint: string;
  reason_for_referral: string;
  clinical_summary: string;
  current_medications: string[];
  allergies: string[];
  relevant_history: string;
  diagnostic_findings: string;
  requested_evaluation: string;
  urgency: string;
  follow_up_instructions: string;
}

interface ReferralPdfEditorProps {
  pdfBase64: string;
  referralContent: ReferralPdfContent;
  encounterId: string;
  onSave?: (content: ReferralPdfContent) => Promise<void>;
  onSend?: (content: ReferralPdfContent) => Promise<void>;
  onClose?: () => void;
}

export default function ReferralPdfEditor({
  pdfBase64,
  referralContent: initialContent,
  encounterId,
  onSave,
  onSend,
  onClose,
}: ReferralPdfEditorProps) {
  const [content, setContent] = useState<ReferralPdfContent>(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const { showError, showSuccess } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    // Create blob URL for PDF
    try {
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating PDF URL:", error);
    }
  }, [pdfBase64]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(content);
      setIsEditing(false);
      showSuccess("Referral PDF saved successfully");
    } catch (error) {
      console.error("Error saving:", error);
      showError("Failed to save referral PDF. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!onSend) return;
    setIsSending(true);
    try {
      await onSend(content);
      showSuccess("Referral PDF sent successfully");
    } catch (error) {
      console.error("Error sending:", error);
      showError("Failed to send referral PDF. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) {
      showError("PDF not ready for download");
      return;
    }
    try {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `referral-${encounterId}-${Date.now()}.pdf`;
      link.click();
      showSuccess("PDF download started");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      showError("Failed to download PDF. Please try again.");
    }
  };

  const updateField = (field: keyof ReferralPdfContent, value: any) => {
    setContent((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-surface-200 px-8 py-4 flex items-center justify-between bg-surface-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink-900">Referral Letter</h2>
            <p className="text-xs text-ink-400">Edit and review before sending</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setContent(initialContent);
                }}
                className="px-4 py-2 rounded-xl border border-surface-200 text-sm font-bold text-ink-600 hover:bg-surface-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl border border-surface-200 text-sm font-bold text-ink-600 hover:bg-surface-100 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl border border-primary-200 text-sm font-bold text-primary-600 hover:bg-primary-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              {onSend && (
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send to Specialist
                </button>
              )}
            </>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl border border-surface-200 flex items-center justify-center hover:bg-surface-100"
            >
              <X className="w-4 h-4 text-ink-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        {isEditing && (
          <div className="w-1/2 border-r border-surface-200 overflow-y-auto bg-surface-50">
            <div className="p-8 space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-400 uppercase tracking-widest">Patient Name</label>
                <input
                  type="text"
                  value={content.patient_name}
                  onChange={(e) => updateField("patient_name", e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:ring-2 ring-primary-100 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-400 uppercase tracking-widest">Specialist Type</label>
                <input
                  type="text"
                  value={content.specialist_type}
                  onChange={(e) => updateField("specialist_type", e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:ring-2 ring-primary-100 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-400 uppercase tracking-widest">Chief Complaint</label>
                <input
                  type="text"
                  value={content.chief_complaint}
                  onChange={(e) => updateField("chief_complaint", e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:ring-2 ring-primary-100 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-400 uppercase tracking-widest">Reason for Referral</label>
                <textarea
                  value={content.reason_for_referral}
                  onChange={(e) => updateField("reason_for_referral", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:ring-2 ring-primary-100 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-400 uppercase tracking-widest">Clinical Summary</label>
                <textarea
                  value={content.clinical_summary}
                  onChange={(e) => updateField("clinical_summary", e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:ring-2 ring-primary-100 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-400 uppercase tracking-widest">Relevant History</label>
                <textarea
                  value={content.relevant_history}
                  onChange={(e) => updateField("relevant_history", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:ring-2 ring-primary-100 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-400 uppercase tracking-widest">Diagnostic Findings</label>
                <textarea
                  value={content.diagnostic_findings}
                  onChange={(e) => updateField("diagnostic_findings", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:ring-2 ring-primary-100 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-400 uppercase tracking-widest">Requested Evaluation</label>
                <textarea
                  value={content.requested_evaluation}
                  onChange={(e) => updateField("requested_evaluation", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:ring-2 ring-primary-100 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-400 uppercase tracking-widest">Follow-up Instructions</label>
                <textarea
                  value={content.follow_up_instructions}
                  onChange={(e) => updateField("follow_up_instructions", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:ring-2 ring-primary-100 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* PDF Preview */}
        <div className={`${isEditing ? "w-1/2" : "w-full"} overflow-y-auto bg-surface-100`}>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Referral PDF Preview"
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-ink-300 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

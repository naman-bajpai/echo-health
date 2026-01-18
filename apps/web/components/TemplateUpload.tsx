"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface TemplateUploadProps {
  onTemplateUploaded: (templateId: string, questions: any[]) => void;
  onTemplateSelected: (templateId: string, questions: any[]) => void;
  existingTemplates?: Array<{
    id: string;
    template_name: string;
    created_at: string;
  }>;
}

interface Question {
  id: string;
  question: string;
  category: string;
  required: boolean;
  answered: boolean;
  field_mapping?: string;
}

export default function TemplateUpload({
  onTemplateUploaded,
  onTemplateSelected,
  existingTemplates = [],
}: TemplateUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const { showError, showSuccess } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
    setUploadError(null);
    setUploadSuccess(false);

    // Extract text from file (only TXT files for now)
    try {
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setExtractedText(text);
      } else {
        setUploadError("Please upload a TXT file, or paste the template content below.");
        setSelectedFile(null);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      setUploadError("Failed to read file. Please try again.");
    }
  };

  const handleUpload = async () => {
    if (!templateName.trim()) {
      setUploadError("Please enter a template name");
      return;
    }

    if (!extractedText.trim() && !selectedFile) {
      setUploadError("Please upload a file or paste template content");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Use extracted text or read from file
      let templateContent = extractedText;
      if (!templateContent && selectedFile) {
        templateContent = await selectedFile.text();
      }

      if (!templateContent.trim()) {
        throw new Error("Template content is empty");
      }

      // Upload template
      const response = await fetch("/api/supabase/upload-ehr-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateName,
          templateContent,
          fileType: selectedFile?.type || selectedFile?.name.split(".").pop() || "txt",
          customFields: customFields.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      setUploadSuccess(true);
      showSuccess("Template uploaded successfully");
      onTemplateUploaded(result.template.id, result.questions || []);
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMsg = error.message || "Failed to upload template";
      setUploadError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectExistingTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsGenerating(true);
    setUploadError(null);

    try {
      // Generate questions for this template
      const response = await fetch("/api/supabase/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate questions");
      }

      const result = await response.json();
      showSuccess("Questions generated successfully");
      onTemplateSelected(templateId, result.questions || []);
    } catch (error: any) {
      console.error("Generate questions error:", error);
      const errorMsg = error.message || "Failed to generate questions";
      setUploadError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Templates */}
      {existingTemplates.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-ink-700 mb-3">Select Existing Template</h4>
          <div className="space-y-2">
            {existingTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectExistingTemplate(template.id)}
                disabled={isGenerating}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  selectedTemplateId === template.id
                    ? "bg-primary-50 border-primary-300 shadow-soft"
                    : "bg-white border-surface-200 hover:border-primary-200"
                } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-ink-900">{template.template_name}</p>
                    <p className="text-xs text-ink-400">
                      {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {isGenerating && selectedTemplateId === template.id ? (
                  <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                ) : selectedTemplateId === template.id ? (
                  <CheckCircle2 className="w-5 h-5 text-primary-500" />
                ) : (
                  <Sparkles className="w-5 h-5 text-ink-300" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {existingTemplates.length > 0 && (
        <div className="text-center">
          <span className="text-xs font-black text-ink-200 uppercase tracking-[0.3em]">or</span>
        </div>
      )}

      {/* Upload New Template */}
      <div>
        <h4 className="text-sm font-bold text-ink-700 mb-3">Upload New Template</h4>
        <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
          {/* File Input */}
          <div>
            <label className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2 block">
              Template File (PDF, DOCX, or TXT)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-surface-200 rounded-2xl p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-primary-500" />
                  <div className="text-left">
                    <p className="font-bold text-ink-900">{selectedFile.name}</p>
                    <p className="text-xs text-ink-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setExtractedText("");
                      setTemplateName("");
                    }}
                    className="ml-auto p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-ink-300 mx-auto mb-3" />
                  <p className="font-bold text-ink-700 mb-1">Click to upload template</p>
                  <p className="text-xs text-ink-400">PDF, DOCX, or TXT files</p>
                </div>
              )}
            </div>
          </div>

          {/* Template Name */}
          <div>
            <label className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2 block">
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., General Intake Form"
              className="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl font-medium focus:ring-4 ring-primary-50 outline-none focus:border-primary-200 transition-all"
            />
          </div>

          {/* Or Paste Content */}
          <div>
            <label className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2 block">
              Or Paste Template Content
            </label>
            <textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="Paste your EHR template content here..."
              rows={8}
              className="w-full p-4 bg-surface-50 border border-surface-200 rounded-xl font-mono text-sm focus:ring-4 ring-primary-50 outline-none focus:border-primary-200 transition-all resize-none"
            />
          </div>

          {/* Custom Fields Input */}
          <div>
            <label className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2 block">
              Custom Fields (Optional)
            </label>
            <p className="text-[10px] text-ink-300 mb-2">
              Define custom fields you want to collect. One per line, format: "Field Name: Type" or JSON array.
              <br />
              Examples: "Blood Pressure: text", "Allergies: array", "Medications: array"
            </p>
            <textarea
              value={customFields}
              onChange={(e) => setCustomFields(e.target.value)}
              placeholder={`Example formats:
Blood Pressure: text
Heart Rate: number
Allergies: array
Medications: array
Past Surgeries: text
Family History: text

Or JSON:
[
  {"name": "Blood Pressure", "type": "text", "required": true},
  {"name": "Allergies", "type": "array", "required": false}
]`}
              rows={6}
              className="w-full p-4 bg-surface-50 border border-surface-200 rounded-xl font-mono text-sm focus:ring-4 ring-primary-50 outline-none focus:border-primary-200 transition-all resize-none"
            />
          </div>

          {/* Error/Success Messages */}
          {uploadError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{uploadError}</p>
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p>Template uploaded and questions generated successfully!</p>
            </div>
          )}

          {/* Upload Button */}
          {templateName && (selectedFile || extractedText.trim()) && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full h-12 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading & Generating Questions...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Upload Template & Generate Questions</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Skip Option */}
      <div className="text-center">
        <button
          onClick={() => {
            onTemplateSelected("", []);
          }}
          className="text-sm font-bold text-ink-400 hover:text-ink-900 transition-colors"
        >
          Skip template (use default questions)
        </button>
      </div>
    </div>
  );
}

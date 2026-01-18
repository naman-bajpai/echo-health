"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/logo.png";
import { useToast } from "@/components/ToastProvider";
import {
  Plus,
  FileText,
  Trash2,
  Edit2,
  Calendar,
  LogOut,
  Loader2,
  Search,
  ArrowLeft,
  Upload,
  Download,
  Eye,
  CheckCircle,
} from "lucide-react";
import { uploadEhrTemplate } from "@/lib/api";

interface Template {
  id: string;
  template_name: string;
  template_content: string;
  file_url?: string;
  file_type?: string;
  created_at: string;
  updated_at?: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Upload form state
  const [templateName, setTemplateName] = useState("");
  const { showError, showSuccess } = useToast();
  const [templateContent, setTemplateContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const loadTemplates = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("ehr_templates")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setTemplates(data);
        } else if (error) {
          showError("Failed to load templates. Please try again.");
        }
      } catch (err) {
        console.error("Error loading templates:", err);
        showError("Failed to load templates. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [user]);

  const handleUpload = async () => {
    if (!templateName.trim() || !templateContent.trim()) return;

    setIsUploading(true);
    try {
      const result = await uploadEhrTemplate(templateName, templateContent);
      
      // Refresh templates list
      const { data } = await supabase
        .from("ehr_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setTemplates(data);
      }

      setUploadSuccess(true);
      showSuccess("Template uploaded successfully");
      setTimeout(() => {
        setShowUploadModal(false);
        setTemplateName("");
        setTemplateContent("");
        setUploadSuccess(false);
      }, 1500);
    } catch (err) {
      console.error("Error uploading template:", err);
      showError("Failed to upload template. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await supabase.from("ehr_templates").delete().eq("id", id);
      setTemplates(templates.filter(t => t.id !== id));
      showSuccess("Template deleted successfully");
    } catch (err) {
      console.error("Error deleting template:", err);
      showError("Failed to delete template. Please try again.");
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.template_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-ink-500">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center hover:bg-surface-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-ink-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-ink-900">EHR Templates</h1>
              <p className="text-sm text-ink-400">Manage your intake templates</p>
            </div>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-2xl font-bold text-sm hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-300" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-surface-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
            />
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-surface-200 text-center">
            <FileText className="w-16 h-16 text-ink-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-ink-900 mb-2">No Templates Found</h3>
            <p className="text-ink-400 mb-6">Create your first EHR template to get started.</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-2xl font-bold text-sm hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-3xl p-6 border border-surface-200 shadow-soft hover:shadow-soft-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTemplate(template)}
                      className="w-8 h-8 bg-surface-100 rounded-lg flex items-center justify-center hover:bg-surface-200 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-ink-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-ink-900 mb-2">{template.template_name}</h3>
                <p className="text-sm text-ink-400 line-clamp-2 mb-4">
                  {template.template_content.substring(0, 100)}...
                </p>
                <div className="flex items-center gap-2 text-xs text-ink-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(template.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-ink-900 mb-6">Create New Template</h2>
            
            {uploadSuccess ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-lg font-bold text-ink-900">Template Created!</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-ink-700 mb-2">Template Name</label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Primary Care Intake Form"
                      className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-ink-700 mb-2">Template Content</label>
                    <textarea
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      placeholder="Paste your EHR template content here. Include field names and sections that need to be filled during patient intake..."
                      rows={12}
                      className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-5 py-3 bg-surface-100 text-ink-600 rounded-2xl font-bold text-sm hover:bg-surface-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading || !templateName.trim() || !templateContent.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-primary-500 text-white rounded-2xl font-bold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Create Template
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* View Template Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-ink-900">{selectedTemplate.template_name}</h2>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="w-8 h-8 bg-surface-100 rounded-lg flex items-center justify-center hover:bg-surface-200 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="bg-surface-50 rounded-2xl p-6 max-h-[60vh] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-ink-700 font-mono">
                {selectedTemplate.template_content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

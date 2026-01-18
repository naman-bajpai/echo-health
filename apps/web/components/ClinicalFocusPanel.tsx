"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  AlertTriangle,
  HelpCircle,
  Stethoscope,
  Lightbulb,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Target,
  Sparkles,
  Activity,
  FileQuestion,
  TestTube,
  ClipboardList,
} from "lucide-react";

interface PossibleCondition {
  condition: string;
  likelihood: "high" | "medium" | "low";
  reasoning: string;
  supporting_symptoms: string[];
  icd10_hint?: string;
}

interface RecommendedQuestion {
  question: string;
  purpose: string;
  priority: "critical" | "important" | "helpful";
  category: string;
  related_conditions: string[];
}

interface ClinicalFocus {
  possible_conditions: PossibleCondition[];
  recommended_questions: RecommendedQuestion[];
  red_flags: string[];
  key_findings: string[];
  information_gaps: string[];
  suggested_tests: string[];
  urgency_level: "routine" | "urgent" | "emergent";
  clinical_summary: string;
  generated_at: string;
}

interface ClinicalFocusPanelProps {
  clinicalFocus: ClinicalFocus | null;
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
  onQuestionAsked?: (question: string) => void;
}

export default function ClinicalFocusPanel({
  clinicalFocus,
  onRefresh,
  isLoading,
  onQuestionAsked,
}: ClinicalFocusPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedCondition, setExpandedCondition] = useState<number | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"conditions" | "questions" | "gaps">("conditions");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setAskedQuestions(prev => new Set([...prev, question]));
    onQuestionAsked?.(question);
  };

  const loading = isLoading || isRefreshing;

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
      case "low": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500 text-white";
      case "important": return "bg-amber-500 text-white";
      case "helpful": return "bg-blue-500 text-white";
      default: return "bg-slate-500 text-white";
    }
  };

  const getUrgencyStyle = (level: string) => {
    switch (level) {
      case "emergent": return "bg-red-50 border-red-200 text-red-800";
      case "urgent": return "bg-amber-50 border-amber-200 text-amber-800";
      default: return "bg-emerald-50 border-emerald-200 text-emerald-800";
    }
  };

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">Clinical Focus</h2>
                <p className="text-ink-400 text-sm">AI-powered differential diagnosis & question guidance</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-ink-900 text-white rounded-2xl font-bold text-sm shadow-soft hover:bg-black transition-all disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {clinicalFocus ? "Re-analyze" : "Analyze"}
          </button>
        </div>

        {!clinicalFocus ? (
          <div className="py-24 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-purple-50 rounded-3xl flex items-center justify-center mb-6">
              <Brain className="w-12 h-12 text-purple-300" />
            </div>
            <h3 className="text-xl font-bold text-ink-900">Ready for Analysis</h3>
            <p className="text-ink-400 max-w-md mt-2">
              Start the conversation with the patient. The AI will analyze symptoms and suggest possible conditions and follow-up questions.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Urgency Banner */}
            {clinicalFocus.urgency_level !== "routine" && (
              <div className={`p-5 rounded-2xl border-2 flex items-start gap-4 ${getUrgencyStyle(clinicalFocus.urgency_level)}`}>
                <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-wide text-sm">
                    {clinicalFocus.urgency_level === "emergent" ? "EMERGENT - Immediate Attention Required" : "URGENT - Prompt Attention Needed"}
                  </p>
                  <p className="text-sm mt-1 opacity-80">{clinicalFocus.clinical_summary}</p>
                </div>
              </div>
            )}

            {/* Red Flags */}
            {clinicalFocus.red_flags.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-900">Red Flags Detected</h3>
                </div>
                <div className="grid gap-2">
                  {clinicalFocus.red_flags.map((flag, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white/60 p-3 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm font-medium text-red-800">{flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-surface-100 rounded-2xl">
              <button
                onClick={() => setActiveTab("conditions")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  activeTab === "conditions" 
                    ? "bg-white text-ink-900 shadow-soft" 
                    : "text-ink-400 hover:text-ink-600"
                }`}
              >
                <Target className="w-4 h-4" />
                Possible Conditions ({clinicalFocus.possible_conditions.length})
              </button>
              <button
                onClick={() => setActiveTab("questions")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  activeTab === "questions" 
                    ? "bg-white text-ink-900 shadow-soft" 
                    : "text-ink-400 hover:text-ink-600"
                }`}
              >
                <FileQuestion className="w-4 h-4" />
                Suggested Questions ({clinicalFocus.recommended_questions.length})
              </button>
              <button
                onClick={() => setActiveTab("gaps")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  activeTab === "gaps" 
                    ? "bg-white text-ink-900 shadow-soft" 
                    : "text-ink-400 hover:text-ink-600"
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                Info Gaps ({clinicalFocus.information_gaps.length})
              </button>
            </div>

            {/* Possible Conditions Tab */}
            {activeTab === "conditions" && (
              <div className="space-y-4">
                <h3 className="font-bold text-ink-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-purple-500" />
                  Differential Diagnoses
                </h3>
                
                {clinicalFocus.possible_conditions.length === 0 ? (
                  <p className="text-ink-400 text-sm italic py-4">More information needed to suggest conditions...</p>
                ) : (
                  <div className="space-y-3">
                    {clinicalFocus.possible_conditions.map((condition, idx) => (
                      <div
                        key={idx}
                        className="bg-surface-50 rounded-2xl border border-surface-200 overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedCondition(expandedCondition === idx ? null : idx)}
                          className="w-full p-5 flex items-center justify-between text-left hover:bg-surface-100 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide border ${getLikelihoodColor(condition.likelihood)}`}>
                              {condition.likelihood}
                            </div>
                            <div>
                              <p className="font-bold text-ink-900">{condition.condition}</p>
                              {condition.icd10_hint && (
                                <p className="text-xs text-ink-400 font-mono mt-0.5">{condition.icd10_hint}</p>
                              )}
                            </div>
                          </div>
                          {expandedCondition === idx ? (
                            <ChevronUp className="w-5 h-5 text-ink-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-ink-400" />
                          )}
                        </button>
                        
                        {expandedCondition === idx && (
                          <div className="px-5 pb-5 pt-0 border-t border-surface-200 bg-white">
                            <p className="text-sm text-ink-600 mb-4 mt-4">{condition.reasoning}</p>
                            <div>
                              <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">Supporting Symptoms</p>
                              <div className="flex flex-wrap gap-2">
                                {condition.supporting_symptoms.map((symptom, sidx) => (
                                  <span key={sidx} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                                    {symptom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recommended Questions Tab */}
            {activeTab === "questions" && (
              <div className="space-y-4">
                <h3 className="font-bold text-ink-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-500" />
                  Recommended Questions to Ask
                </h3>
                
                {clinicalFocus.recommended_questions.length === 0 ? (
                  <p className="text-ink-400 text-sm italic py-4">Continue the conversation to get question recommendations...</p>
                ) : (
                  <div className="space-y-3">
                    {/* Critical Questions First */}
                    {["critical", "important", "helpful"].map(priority => {
                      const questions = clinicalFocus.recommended_questions.filter(q => q.priority === priority);
                      if (questions.length === 0) return null;
                      
                      return (
                        <div key={priority} className="space-y-2">
                          <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">
                            {priority === "critical" ? "🔴 Critical Questions" : 
                             priority === "important" ? "🟡 Important Questions" : 
                             "🔵 Helpful Questions"}
                          </p>
                          {questions.map((q, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-2xl border transition-all ${
                                askedQuestions.has(q.question)
                                  ? "bg-emerald-50 border-emerald-200"
                                  : "bg-white border-surface-200 hover:border-primary-200"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => handleQuestionClick(q.question)}
                                  className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                    askedQuestions.has(q.question)
                                      ? "bg-emerald-500 text-white"
                                      : "bg-surface-100 text-ink-400 hover:bg-primary-100 hover:text-primary-600"
                                  }`}
                                >
                                  {askedQuestions.has(q.question) ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : (
                                    <span className="text-xs font-bold">{idx + 1}</span>
                                  )}
                                </button>
                                <div className="flex-1">
                                  <p className={`font-medium ${askedQuestions.has(q.question) ? "text-emerald-800 line-through opacity-60" : "text-ink-900"}`}>
                                    "{q.question}"
                                  </p>
                                  <p className="text-xs text-ink-500 mt-1">{q.purpose}</p>
                                  {q.related_conditions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {q.related_conditions.map((cond, cidx) => (
                                        <span key={cidx} className="px-2 py-0.5 bg-surface-100 text-ink-500 rounded text-xs">
                                          {cond}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Information Gaps Tab */}
            {activeTab === "gaps" && (
              <div className="space-y-6">
                {/* Information Gaps */}
                <div>
                  <h3 className="font-bold text-ink-900 flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    Information Gaps
                  </h3>
                  {clinicalFocus.information_gaps.length === 0 ? (
                    <p className="text-ink-400 text-sm italic">No significant gaps identified yet...</p>
                  ) : (
                    <div className="grid gap-2">
                      {clinicalFocus.information_gaps.map((gap, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span className="text-sm text-amber-800">{gap}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suggested Tests */}
                {clinicalFocus.suggested_tests.length > 0 && (
                  <div>
                    <h3 className="font-bold text-ink-900 flex items-center gap-2 mb-4">
                      <TestTube className="w-5 h-5 text-blue-500" />
                      Suggested Diagnostic Tests
                    </h3>
                    <div className="grid gap-2">
                      {clinicalFocus.suggested_tests.map((test, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          <span className="text-sm text-blue-800 font-medium">{test}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Findings */}
                {clinicalFocus.key_findings.length > 0 && (
                  <div>
                    <h3 className="font-bold text-ink-900 flex items-center gap-2 mb-4">
                      <ClipboardList className="w-5 h-5 text-emerald-500" />
                      Key Clinical Findings
                    </h3>
                    <div className="grid gap-2">
                      {clinicalFocus.key_findings.map((finding, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-sm text-emerald-800">{finding}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clinical Summary */}
            {clinicalFocus.urgency_level === "routine" && (
              <div className="bg-surface-50 rounded-2xl p-6 border border-surface-200">
                <h3 className="font-bold text-ink-900 flex items-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-ink-500" />
                  Clinical Summary
                </h3>
                <p className="text-sm text-ink-600 leading-relaxed">{clinicalFocus.clinical_summary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

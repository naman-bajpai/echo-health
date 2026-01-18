"use client";

import { useEffect, useState } from "react";
import { FileText, Sparkles, Activity, Brain, HelpCircle, AlertTriangle, CheckCircle2, Target } from "lucide-react";

interface RecommendedQuestion {
  question: string;
  purpose: string;
  priority: "critical" | "important" | "helpful";
  category: string;
  related_conditions: string[];
}

interface PossibleCondition {
  condition: string;
  likelihood: "high" | "medium" | "low";
  reasoning: string;
}

interface ClinicalFocus {
  possible_conditions?: PossibleCondition[];
  recommended_questions?: RecommendedQuestion[];
  red_flags?: string[];
  key_findings?: string[];
}

export interface RealtimeNotesPanelProps {
  className?: string;
  clinicalFocus?: ClinicalFocus | null;
  encounterId?: string;
}

export function RealtimeNotesPanel({ className, clinicalFocus, encounterId }: RealtimeNotesPanelProps) {
  const [notes, setNotes] = useState<string>("");
  const [recentTranscription, setRecentTranscription] = useState<string>("");
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<"questions" | "conditions" | "notes">("questions");

  useEffect(() => {
    const handleNotesUpdate = (event: CustomEvent) => {
      if (event.detail?.notes) setNotes(event.detail.notes);
    };
    const handleTranscriptionUpdate = (event: CustomEvent) => {
      if (event.detail?.transcription) setRecentTranscription(event.detail.transcription);
    };
    window.addEventListener("echo-health-notes-updated", handleNotesUpdate as EventListener);
    window.addEventListener("echo-health-transcription-updated", handleTranscriptionUpdate as EventListener);
    return () => {
      window.removeEventListener("echo-health-notes-updated", handleNotesUpdate as EventListener);
      window.removeEventListener("echo-health-transcription-updated", handleTranscriptionUpdate as EventListener);
    };
  }, []);

  const noteWordCount = notes.trim().split(/\s+/).filter(Boolean).length;
  
  const criticalQuestions = clinicalFocus?.recommended_questions?.filter(q => q.priority === "critical") || [];
  const importantQuestions = clinicalFocus?.recommended_questions?.filter(q => q.priority === "important") || [];
  const topConditions = clinicalFocus?.possible_conditions?.slice(0, 3) || [];
  const redFlags = clinicalFocus?.red_flags || [];

  const handleQuestionClick = (question: string) => {
    setAskedQuestions(prev => new Set([...prev, question]));
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-amber-600 bg-amber-50";
      default: return "text-slate-600 bg-slate-50";
    }
  };

  return (
    <div className={`flex flex-col h-full bg-surface-50/50 ${className || ""}`}>
      {/* Live Context Section */}
      <div className="p-4 border-b border-surface-100">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary-500" />
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-400">Live Context</span>
        </div>
        
        <div className="min-h-[60px] p-3 rounded-xl bg-white border border-surface-200 shadow-inner-soft">
          {recentTranscription ? (
            <p className="text-xs text-ink-600 leading-relaxed italic animate-fade-in">
              "{recentTranscription}"
            </p>
          ) : (
            <p className="text-[10px] text-ink-300 italic text-center py-2">
              Awaiting live audio...
            </p>
          )}
        </div>
      </div>

      {/* Red Flags Alert */}
      {redFlags.length > 0 && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-bold text-red-700 uppercase">Red Flags</span>
          </div>
          <div className="space-y-1">
            {redFlags.slice(0, 3).map((flag, idx) => (
              <p key={idx} className="text-xs text-red-700">{flag}</p>
            ))}
          </div>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-surface-100">
        <button
          onClick={() => setActiveSection("questions")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSection === "questions" 
              ? "bg-primary-100 text-primary-700" 
              : "text-ink-400 hover:bg-surface-100"
          }`}
        >
          <HelpCircle className="w-3 h-3" />
          Ask
        </button>
        <button
          onClick={() => setActiveSection("conditions")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSection === "conditions" 
              ? "bg-purple-100 text-purple-700" 
              : "text-ink-400 hover:bg-surface-100"
          }`}
        >
          <Target className="w-3 h-3" />
          DDx
        </button>
        <button
          onClick={() => setActiveSection("notes")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSection === "notes" 
              ? "bg-accent-100 text-accent-700" 
              : "text-ink-400 hover:bg-surface-100"
          }`}
        >
          <FileText className="w-3 h-3" />
          Notes
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Recommended Questions Section */}
        {activeSection === "questions" && (
          <div className="space-y-3">
            {criticalQuestions.length === 0 && importantQuestions.length === 0 ? (
              <div className="flex flex-col items-center py-8 opacity-50">
                <HelpCircle className="w-8 h-8 mb-2 text-ink-300" />
                <p className="text-xs text-ink-400 text-center">Questions will appear as the conversation progresses</p>
              </div>
            ) : (
              <>
                {criticalQuestions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">Critical to Ask</p>
                    {criticalQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuestionClick(q.question)}
                        className={`w-full text-left p-3 rounded-xl mb-2 transition-all ${
                          askedQuestions.has(q.question)
                            ? "bg-emerald-50 border border-emerald-200"
                            : "bg-white border border-red-100 hover:border-red-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {askedQuestions.has(q.question) ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-red-300 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className={`text-xs font-medium ${askedQuestions.has(q.question) ? "text-emerald-700 line-through" : "text-ink-800"}`}>
                              {q.question}
                            </p>
                            <p className="text-[10px] text-ink-400 mt-1">{q.purpose}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {importantQuestions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Important</p>
                    {importantQuestions.slice(0, 4).map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuestionClick(q.question)}
                        className={`w-full text-left p-2.5 rounded-xl mb-1.5 transition-all ${
                          askedQuestions.has(q.question)
                            ? "bg-emerald-50 border border-emerald-200"
                            : "bg-white border border-surface-200 hover:border-amber-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {askedQuestions.has(q.question) ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-300 flex-shrink-0 mt-0.5" />
                          )}
                          <p className={`text-[11px] font-medium ${askedQuestions.has(q.question) ? "text-emerald-700 line-through" : "text-ink-700"}`}>
                            {q.question}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Possible Conditions Section */}
        {activeSection === "conditions" && (
          <div className="space-y-2">
            {topConditions.length === 0 ? (
              <div className="flex flex-col items-center py-8 opacity-50">
                <Brain className="w-8 h-8 mb-2 text-ink-300" />
                <p className="text-xs text-ink-400 text-center">Possible conditions will appear based on symptoms</p>
              </div>
            ) : (
              topConditions.map((cond, idx) => (
                <div key={idx} className="bg-white rounded-xl p-3 border border-surface-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-ink-800">{cond.condition}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getLikelihoodColor(cond.likelihood)}`}>
                      {cond.likelihood}
                    </span>
                  </div>
                  <p className="text-[10px] text-ink-500 leading-relaxed">{cond.reasoning}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Notes Section */}
        {activeSection === "notes" && (
          <div>
            {notes ? (
              <div className="prose prose-sm max-w-none text-ink-700">
                {notes.split('\n').map((line, idx) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={idx} className="mb-2 text-sm font-bold text-ink-900 mt-3">{line.substring(2)}</h1>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={idx} className="mb-2 text-xs font-bold text-ink-900 mt-2">{line.substring(3)}</h2>;
                  } else if (line.startsWith('- ') || line.startsWith('* ')) {
                    return <div key={idx} className="flex gap-2 text-xs mb-1 text-ink-600"><span className="text-primary-400">•</span> {line.substring(2)}</div>;
                  } else if (line.trim() === '') {
                    return <div key={idx} className="h-1" />;
                  } else {
                    return <p key={idx} className="text-xs mb-2 leading-relaxed">{line}</p>;
                  }
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 opacity-50">
                <FileText className="w-8 h-8 mb-2 text-ink-300" />
                <p className="text-xs text-ink-400 text-center">Notes will appear during the session</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

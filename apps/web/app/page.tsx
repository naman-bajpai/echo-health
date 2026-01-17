"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  ArrowRight, 
  Shield, 
  Mic, 
  FileText, 
  Loader2,
  Sparkles,
  CheckCircle2,
  Zap
} from "lucide-react";
import { startEncounter } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [patientName, setPatientName] = useState("");
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStarting(true);
    setError(null);

    try {
      const response = await startEncounter(
        patientName || undefined,
        reasonForVisit || undefined
      );
      router.push(`/encounter/${response.encounterId}`);
    } catch (err) {
      console.error("Failed to start encounter:", err);
      setError(err instanceof Error ? err.message : "Failed to start encounter");
      setIsStarting(false);
    }
  };

  return (
    <main className="flex-1 bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/30">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Echo Health
            </h1>
            <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm font-semibold rounded-full">
              Nexhacks
            </span>
          </div>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl leading-relaxed">
            AI-powered healthcare documentation that keeps you focused on what matters most — 
            <span className="text-primary-600 font-semibold"> patient care</span>.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Start Encounter Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <h2 className="text-xl font-bold text-gray-900">
                  Start New Encounter
                </h2>
              </div>

              <form onSubmit={handleStartEncounter} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient name (optional)"
                    className="input"
                    disabled={isStarting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason for Visit
                  </label>
                  <input
                    type="text"
                    value={reasonForVisit}
                    onChange={(e) => setReasonForVisit(e.target.value)}
                    placeholder="e.g., Annual checkup"
                    className="input"
                    disabled={isStarting}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStarting}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 px-6 rounded-xl font-semibold text-lg
                           hover:from-primary-700 hover:to-primary-800 
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 shadow-lg shadow-primary-600/30
                           flex items-center justify-center gap-3"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      Start Encounter
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-xs text-gray-400 mt-4 text-center">
                Information can be added during the encounter
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="lg:col-span-3 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              How It Works
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <FeatureCard
                icon={<Mic className="w-6 h-6" />}
                title="Voice Recording"
                description="Record patient conversations with one click"
                color="blue"
              />

              <FeatureCard
                icon={<Zap className="w-6 h-6" />}
                title="Smart Extraction"
                description="AI extracts key information from transcripts"
                color="amber"
              />

              <FeatureCard
                icon={<FileText className="w-6 h-6" />}
                title="Auto Documentation"
                description="Generate SOAP notes and summaries instantly"
                color="emerald"
              />

              <FeatureCard
                icon={<Shield className="w-6 h-6" />}
                title="Built-in Compliance"
                description="All outputs follow healthcare regulations"
                color="purple"
              />
            </div>

            {/* Process Steps */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 mt-8 text-white">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Simple 3-Step Process
              </h3>
              <div className="space-y-4">
                <ProcessStep number={1} title="Record" description="Capture the patient conversation" />
                <ProcessStep number={2} title="Review" description="AI extracts fields & generates notes" />
                <ProcessStep number={3} title="Export" description="Download PDF summary for patient" />
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Notice */}
        <div className="mt-16 bg-gradient-to-r from-primary-50 to-blue-50 rounded-3xl p-8 border border-primary-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Shield className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Healthcare Compliance Built-In
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Echo Health generates administrative documentation only. All clinical content 
                is labeled as DRAFT and requires clinician review. The system does not provide 
                diagnoses, treatment recommendations, or medical advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "blue" | "amber" | "emerald" | "purple";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  const iconColors = {
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className={`p-5 rounded-2xl border-2 ${colors[color]} transition-all hover:scale-[1.02]`}>
      <div className={`w-12 h-12 rounded-xl ${iconColors[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
        {number}
      </div>
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
}

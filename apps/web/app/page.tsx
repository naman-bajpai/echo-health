"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  ArrowRight, 
  Shield, 
  Clock, 
  FileText, 
  Loader2 
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
    <main className="flex-1">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-10 h-10" />
            <h1 className="text-3xl md:text-4xl font-bold">Echo Health</h1>
          </div>
          <p className="text-xl md:text-2xl text-primary-100 max-w-2xl">
            AI-powered healthcare documentation that keeps you focused on patient care.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Start Encounter Form */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Start New Encounter
            </h2>

            <form onSubmit={handleStartEncounter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient Name (optional)
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  className="input"
                  disabled={isStarting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Visit (optional)
                </label>
                <input
                  type="text"
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  placeholder="e.g., Annual checkup, Follow-up visit"
                  className="input"
                  disabled={isStarting}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isStarting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting Encounter...
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
              Patient information can be added during the encounter
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              How It Works
            </h2>

            <FeatureCard
              icon={<Clock className="w-6 h-6 text-primary-600" />}
              title="Real-time Transcription"
              description="Capture patient conversations automatically with AI-powered transcription"
            />

            <FeatureCard
              icon={<FileText className="w-6 h-6 text-primary-600" />}
              title="Smart Documentation"
              description="Generate draft SOAP notes and patient summaries from transcripts"
            />

            <FeatureCard
              icon={<Shield className="w-6 h-6 text-primary-600" />}
              title="Compliance Built-in"
              description="All outputs are compliant with healthcare regulations - no diagnoses, just documentation"
            />
          </div>
        </div>

        {/* Compliance Notice */}
        <div className="mt-12 bg-gray-50 rounded-xl p-6 text-center">
          <Shield className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="font-medium text-gray-700 mb-2">
            Healthcare Compliance
          </h3>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            Echo Health generates administrative documentation only. All clinical content 
            is labeled as DRAFT and requires clinician review. The system does not provide 
            diagnoses, treatment recommendations, or medical advice.
          </p>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-4 bg-white rounded-xl border border-gray-200">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
}

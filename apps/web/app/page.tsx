"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  Mic,
  Brain,
  FileText,
  ArrowRight,
  Stethoscope,
  BadgeCheck,
  AlertCircle,
  Sparkles,
  Waves,
  HeartPulse,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { setRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"nurse" | "doctor">("nurse");
  const [userName, setUserName] = useState("");
  const [isHovering, setIsHovering] = useState(false);

  const handleStart = () => {
    setRole(selectedRole, userName || undefined);
    router.push("/dashboard");
  };

  const features = [
    {
      icon: Waves,
      title: "Voice Intelligence",
      description: "Automatic speaker detection with real-time transcription",
      gradient: "from-primary-500 to-primary-600",
    },
    {
      icon: Brain,
      title: "Smart Extraction",
      description: "AI extracts symptoms, medications, and allergies instantly",
      gradient: "from-accent-500 to-accent-600",
    },
    {
      icon: AlertCircle,
      title: "Urgency Triage",
      description: "Intelligent flagging of urgent cases and specialist needs",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: ClipboardCheck,
      title: "Compliant Notes",
      description: "Generate SOAP notes that meet documentation standards",
      gradient: "from-sage-500 to-sage-600",
    },
  ];

  return (
    <div className="min-h-screen bg-surface-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-accent-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-40 h-40 bg-sage-200/30 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-surface-300/50 bg-white/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center h-20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-glow">
                  <HeartPulse className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 rounded-full border-2 border-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-ink-800 tracking-tight">
                  Echo<span className="text-primary-600">Health</span>
                </span>
                <p className="text-xs text-ink-500 -mt-0.5">Intelligent Documentation</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-surface-300 shadow-soft">
                <Sparkles className="w-4 h-4 text-accent-500" />
                <span className="text-sm font-medium text-ink-600">
                  AI-Powered Healthcare Documentation
                </span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-ink-900 leading-[1.1] tracking-tight">
                Document patient encounters with{" "}
                <span className="relative">
                  <span className="relative z-10 text-primary-600">precision</span>
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary-200" viewBox="0 0 200 12" preserveAspectRatio="none">
                    <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
                  </svg>
                </span>
              </h1>

              <p className="text-xl text-ink-600 leading-relaxed max-w-lg">
                Real-time transcription that listens, understands context, and generates compliant documentation — letting you focus on what matters most.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-3">
                {["Live Transcription", "Speaker Detection", "Urgency Flags", "SOAP Notes"].map((item) => (
                  <span
                    key={item}
                    className="px-4 py-2 bg-surface-100 text-ink-600 rounded-full text-sm font-medium border border-surface-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Right - Login Card */}
            <div className="lg:pl-8">
              <div 
                className="relative bg-white rounded-[2rem] shadow-soft-xl p-10 border border-surface-300/50"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-100 to-transparent rounded-tr-[2rem] rounded-bl-[4rem]" />
                
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-ink-800 mb-2">
                    Get Started
                  </h2>
                  <p className="text-ink-500 mb-8">
                    Select your role to begin documenting
                  </p>

                  {/* Name Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-ink-700 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your name"
                      className="input-minimal"
                    />
                  </div>

                  {/* Role Selection */}
                  <div className="mb-8">
                    <label className="block text-sm font-semibold text-ink-700 mb-3">
                      Select Your Role
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setSelectedRole("nurse")}
                        className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                          selectedRole === "nurse"
                            ? "border-primary-500 bg-primary-50 shadow-glow"
                            : "border-surface-300 bg-surface-50 hover:border-primary-300 hover:bg-primary-50/50"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                          selectedRole === "nurse" ? "bg-primary-500" : "bg-surface-200"
                        }`}>
                          <BadgeCheck className={`w-6 h-6 ${selectedRole === "nurse" ? "text-white" : "text-ink-500"}`} />
                        </div>
                        <span className={`font-semibold block ${selectedRole === "nurse" ? "text-primary-700" : "text-ink-700"}`}>
                          Nurse
                        </span>
                        <span className="text-xs text-ink-500">RN, LPN, NP</span>
                        {selectedRole === "nurse" && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                            <ChevronRight className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>

                      <button
                        onClick={() => setSelectedRole("doctor")}
                        className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                          selectedRole === "doctor"
                            ? "border-primary-500 bg-primary-50 shadow-glow"
                            : "border-surface-300 bg-surface-50 hover:border-primary-300 hover:bg-primary-50/50"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                          selectedRole === "doctor" ? "bg-primary-500" : "bg-surface-200"
                        }`}>
                          <Stethoscope className={`w-6 h-6 ${selectedRole === "doctor" ? "text-white" : "text-ink-500"}`} />
                        </div>
                        <span className={`font-semibold block ${selectedRole === "doctor" ? "text-primary-700" : "text-ink-700"}`}>
                          Doctor
                        </span>
                        <span className="text-xs text-ink-500">MD, DO</span>
                        {selectedRole === "doctor" && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                            <ChevronRight className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleStart}
                    className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold text-lg rounded-2xl shadow-soft hover:shadow-glow transition-all duration-300 flex items-center justify-center gap-3 group"
                  >
                    Enter Dashboard
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6 bg-white border-t border-surface-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-ink-800 mb-4">
              Everything you need for efficient documentation
            </h2>
            <p className="text-lg text-ink-500 max-w-2xl mx-auto">
              Built for healthcare professionals who value their time and patients
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-surface-50 rounded-3xl p-8 border border-surface-200 hover:border-primary-200 hover:shadow-soft-lg transition-all duration-300"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-soft group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-ink-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-ink-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-surface-200 bg-surface-50">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HeartPulse className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-ink-700">EchoHealth</span>
          </div>
          <p className="text-sm text-ink-500">
            Built for Nexhacks 2026 — Healthcare documentation, reimagined.
          </p>
        </div>
      </footer>
    </div>
  );
}

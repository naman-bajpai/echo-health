"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/logo.png";
import { 
  motion, 
  useScroll, 
  useTransform, 
  MotionValue,
} from "framer-motion";
import {
  Brain,
  ArrowRight,
  Sparkles,
  FileText,
  Shield,
  Mic,
  Zap,
  FileDown,
  Hash,
  Menu,
  X,
  Lock,
  Radio,
  Waves,
} from "lucide-react";

// Helper for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" ");

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMdUp, setIsMdUp] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const flowRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress: flowProgress } = useScroll({
    target: flowRef,
    offset: ["start end", "end start"], // Start tracking when section enters viewport from bottom
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsMdUp(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Linear flow animations - start immediately on scroll
  const hubScale = useTransform(flowProgress, [0, 0.25], [0.8, 1]);
  const hubOpacity = useTransform(flowProgress, [0, 0.2], [0, 1]);
  const cardOpacity = useTransform(flowProgress, [0.15, 0.35], [0, 1]);
  
  // Audio input animation
  const audioOpacity = useTransform(flowProgress, [0, 0.15], [0, 1]);

  return (
    <div className="min-h-screen bg-white font-sans text-ink-900 overflow-x-hidden relative">
      {/* Theme Gradient Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-screen bg-gradient-to-b from-primary-50/15 via-white to-white" />
        <div className="absolute top-[20%] right-[-8%] w-[40%] h-[40%] bg-primary-200/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[20%] left-[-8%] w-[40%] h-[40%] bg-accent-200/8 rounded-full blur-[140px]" />
      </div>

      {/* Navbar */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 sm:px-12 flex items-center justify-center",
        isScrolled ? "pt-4" : "pt-8"
      )}>
        <div className={cn(
          "max-w-5xl w-full flex items-center justify-between px-6 py-3 rounded-full transition-all duration-500",
          isScrolled 
            ? "bg-white/80 backdrop-blur-2xl border border-surface-200/50 shadow-soft-xl" 
            : "bg-transparent border border-transparent"
        )}>
          <Link href="/" className="flex items-center gap-2 relative z-10">
            <Image src={logo} alt="Echo Health" width={110} height={32} className="h-7 w-auto" priority />
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-[11px] font-black text-ink-400 hover:text-primary-600 uppercase tracking-widest transition-colors">Technology</Link>
            <Link href="/dashboard" className="text-[11px] font-black text-ink-400 hover:text-primary-600 uppercase tracking-widest transition-colors flex items-center gap-2">
              <Lock className="w-3 h-3" />
              Portal
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="px-6 py-2 bg-ink-950 text-white rounded-full font-black text-[11px] uppercase tracking-widest shadow-soft hover:bg-primary-600 hover:-translate-y-0.5 transition-all"
            >
              Get Started
            </Link>
            <button 
              className="md:hidden p-2 text-ink-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center px-8">
        <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/50 border border-surface-200 rounded-full shadow-soft-sm backdrop-blur-sm"
          >
            <Sparkles className="w-3 h-3 text-primary-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-400">Ambient Clinical Intelligence</span>
          </motion.div>

          <div className="space-y-6">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-7xl md:text-8xl font-black tracking-tighter text-ink-950 leading-[0.85]"
            >
              The focus belongs <br />
              <span className="gradient-text italic">to the patient.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-ink-500 font-medium max-w-2xl mx-auto leading-relaxed"
            >
              Echo Health transforms encounters into records in real-time. No typing. No distractions. Just medicine.
            </motion.p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link 
              href="/get-started" 
              className="px-10 py-5 bg-ink-950 text-white rounded-2xl font-black text-[14px] uppercase tracking-widest shadow-soft-xl hover:bg-primary-600 hover:-translate-y-1 transition-all group w-full sm:w-auto flex items-center justify-center gap-3"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="#how-it-works" className="px-10 py-5 bg-white text-ink-950 border border-surface-200 rounded-2xl font-black text-[14px] uppercase tracking-widest hover:bg-surface-50 transition-all w-full sm:w-auto">
              See the Flow
            </Link>
          </div>
        </div>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-20"
        >
          <div className="w-px h-12 bg-ink-900" />
        </motion.div>
      </section>

      {/* Linear Flow Diagram - Audio → AI → Outputs */}
      <section ref={flowRef} id="how-it-works" className="relative h-[100vh] sm:h-[110vh] w-full py-12">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }} />
          </div>

          {/* Linear Flow: Audio → AI → Outputs */}
          <div className="relative z-30 max-w-7xl mx-auto px-8 w-full">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
              
              {/* Step 1 & 2 Group (The Process) */}
              <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-8">
                {/* Step 1: Audio Input */}
                <motion.div
                  style={{ 
                    opacity: audioOpacity,
                    x: useTransform(flowProgress, [0, 0.15], [-20, 0]),
                  }}
                  className="relative"
                >
                  <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[2rem] border border-surface-200 shadow-soft-xl flex flex-col items-center gap-4 w-44 sm:w-48 group hover:border-primary-300 transition-all duration-500">
                    <div className="flex items-center gap-1.5 h-10">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ 
                            height: [8, 24, 8],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ 
                            duration: 1, 
                            repeat: Infinity, 
                            delay: i * 0.15,
                            ease: "easeInOut"
                          }}
                          className="w-1.5 bg-primary-500 rounded-full"
                        />
                      ))}
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="font-black text-ink-950 text-sm tracking-tight">Live Audio</h4>
                      <p className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Patient Encounter</p>
                    </div>
                  </div>
                </motion.div>

                <ArrowRight className="w-6 h-6 text-primary-300 rotate-90 md:rotate-0 opacity-50" />

                {/* Step 2: AI Processing */}
                <motion.div 
                  style={{ 
                    scale: hubScale,
                    opacity: hubOpacity,
                  }}
                  className="relative"
                >
                  <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[2rem] border border-surface-200 shadow-soft-xl flex flex-col items-center gap-4 w-44 sm:w-48 group hover:border-primary-300 transition-all duration-500">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center shadow-lg">
                      <Brain className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="font-black text-ink-950 text-sm tracking-tight">AI Processing</h4>
                      <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 bg-primary-50 rounded-full">
                        <span className="h-1 w-1 rounded-full bg-primary-500 animate-pulse" />
                        <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest">Active</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <ArrowRight className="w-8 h-8 text-primary-400 rotate-90 lg:rotate-0 opacity-30 hidden sm:block" />

              {/* Step 3: Output Artifacts - Structured Grid */}
              <motion.div
                style={{
                  opacity: cardOpacity,
                  x: useTransform(flowProgress, [0.15, 0.35], [20, 0]),
                }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl"
              >
                {[
                  { icon: FileText, title: "SOAP Notes", desc: "Clinical Documentation", color: "text-primary-600", bg: "bg-primary-50" },
                  { icon: Hash, title: "Billing Codes", desc: "ICD-10 & CPT", color: "text-purple-600", bg: "bg-purple-50" },
                  { icon: FileDown, title: "Summaries", desc: "Patient Recaps", color: "text-rose-600", bg: "bg-rose-50" },
                  { icon: Brain, title: "Clinical Focus", desc: "Differential Dx", color: "text-emerald-600", bg: "bg-emerald-50" },
                  { icon: Shield, title: "Safety Alerts", desc: "Red Flags", color: "text-amber-600", bg: "bg-amber-50" },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    style={{
                      opacity: useTransform(flowProgress, [0.2 + idx * 0.04, 0.4 + idx * 0.04], [0, 1]),
                      scale: useTransform(flowProgress, [0.2 + idx * 0.04, 0.4 + idx * 0.04], [0.85, 1]),
                    }}
                    className={cn(
                      "bg-white/95 backdrop-blur-xl p-5 rounded-2xl border border-surface-200 shadow-soft flex flex-col items-center gap-3 w-40 sm:w-44 group hover:border-primary-300 hover:shadow-soft-xl transition-all duration-500",
                      idx === 3 && "sm:col-start-1 sm:ml-auto", // Center the bottom two on desktop
                      idx === 4 && "sm:col-start-2 sm:mr-auto"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner-soft", item.bg, item.color)}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="text-center space-y-0.5">
                      <h4 className="font-black text-ink-950 text-xs sm:text-sm tracking-tight leading-tight">{item.title}</h4>
                      <p className="text-[9px] font-bold text-ink-400 uppercase tracking-wider">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Massive Footer */}
      <footer className="relative z-10 pt-32 pb-12 flex flex-col items-center justify-center bg-white border-t border-surface-100 overflow-hidden">
        <div className="w-full text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-[18vw] font-black leading-[0.8] tracking-tighter uppercase select-none bg-gradient-to-b from-ink-200 to-transparent bg-clip-text text-transparent"
          >
            Echo Health
          </motion.h2>
        </div>
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex items-center gap-8">
            <div className="h-px w-12 bg-surface-200" />
            <p className="text-[10px] font-black text-ink-300 uppercase tracking-[0.6em]">
              &copy; 2026 Echo Health
            </p>
            <div className="h-px w-12 bg-surface-200" />
          </div>
        </div>
      </footer>
    </div>
  );
}

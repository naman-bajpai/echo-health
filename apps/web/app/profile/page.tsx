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
  User,
  Mail,
  Shield,
  BadgeCheck,
  Stethoscope,
  Settings,
  LogOut,
  Activity,
  Bell,
  Lock,
  Database,
  Globe,
  Plus,
  ArrowUpRight,
  Edit3,
  Save,
  Loader2,
} from "lucide-react";

export default function ClinicianProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [stats, setStats] = useState({ totalEncounters: 0, patientCount: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editUser, setEditUser] = useState<any>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
    if (user) setEditUser(user);
  }, [authLoading, user, router]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!editUser.full_name?.trim()) errors.full_name = "Name is required";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editUser.email?.trim() || !emailRegex.test(editUser.email)) {
      errors.email = "Valid email is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editUser.full_name,
          specialty: editUser.specialty,
          license_number: editUser.license_number,
          email: editUser.email,
        })
        .eq("id", user.id);
      
      if (error) throw error;
      
      setIsEditing(false);
      showSuccess("Profile updated successfully");
      // We might need to refresh the auth context or local state here
      // For now, let's just refresh the page or rely on the fact that we updated the DB
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) {
      console.error("Error updating profile:", e);
      showError(`Failed to update profile: ${e.message || "Please try again"}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const loadStats = async () => {
      const { count: encounterCount } = await supabase
        .from("encounters")
        .select("*", { count: 'exact', head: true })
        .eq("created_by", user.id);
        
      const { count: patientCount } = await supabase
        .from("patients")
        .select("*", { count: 'exact', head: true });

      setStats({ 
        totalEncounters: encounterCount || 0, 
        patientCount: patientCount || 0 
      });
    };

    loadStats();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Activity className="w-10 h-10 text-primary-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50/50 font-sans text-ink-900 pb-20">
      {/* Navbar */}
      <nav className="h-20 bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50 px-8">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/dashboard">
              <Image src={logo} alt="Echo Health" width={110} height={32} className="h-8 w-auto opacity-90" />
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-bold text-ink-400 hover:text-ink-600 transition-colors">Dashboard</Link>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-[3rem] p-10 border border-surface-200 shadow-soft-xl text-center">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    if (isEditing) handleSave();
                    else setIsEditing(true);
                  }}
                  disabled={isSaving}
                  className={`p-2 rounded-xl transition-all ${
                    isEditing 
                      ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                      : "bg-surface-50 text-ink-400 hover:bg-surface-100"
                  }`}
                  title={isEditing ? "Save Changes" : "Edit Profile"}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />)}
                </button>
              </div>

              <div className="relative inline-block mb-6">
                <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow text-white text-4xl font-black">
                  {user.full_name?.charAt(0) || user.email?.charAt(0)}
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-soft flex items-center justify-center border border-surface-100">
                  <BadgeCheck className="w-6 h-6 text-primary-500" />
                </div>
              </div>
              
              {isEditing ? (
                <div className="mb-6 space-y-4">
                  <div className="text-left">
                    <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={editUser.full_name || ""} 
                      onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                      className={`w-full bg-surface-50 border ${fieldErrors.full_name ? "border-red-500" : "border-surface-200"} rounded-xl px-4 py-2 font-bold text-center focus:outline-none`}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-ink-900 mb-1">{user.full_name || "Clinician"}</h2>
                  <p className="text-sm font-bold text-primary-500 uppercase tracking-widest mb-6">
                    {user.role?.toUpperCase() || "MEDICAL STAFF"}
                  </p>
                </>
              )}
              
              <div className="pt-8 border-t border-surface-50 flex flex-col gap-4 text-left">
                {isEditing ? (
                  <>
                    <ProfileStat icon={Stethoscope} label="Specialty" value={editUser.specialty || "General Medicine"} isEditing onChange={(v: string) => setEditUser({ ...editUser, specialty: v })} />
                    <ProfileStat icon={Shield} label="License" value={editUser.license_number || "PENDING-001"} isEditing onChange={(v: string) => setEditUser({ ...editUser, license_number: v })} />
                    <ProfileStat icon={Mail} label="Email" value={editUser.email} isEditing error={fieldErrors.email} onChange={(v: string) => setEditUser({ ...editUser, email: v })} />
                  </>
                ) : (
                  <>
                    <ProfileStat icon={Stethoscope} label="Specialty" value={user.specialty || "General Medicine"} />
                    <ProfileStat icon={Shield} label="License" value={user.license_number || "PENDING-001"} />
                    <ProfileStat icon={Mail} label="Email" value={user.email} />
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-ink-900 text-white rounded-[2.5rem] p-8 shadow-soft-xl space-y-4">
              <button className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-primary-400" />
                  <span className="font-bold text-sm">Account Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-primary-400" />
                  <span className="font-bold text-sm">Security & Privacy</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-12">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-white rounded-[2.5rem] p-8 border border-surface-200 shadow-soft-xl relative overflow-hidden group">
                <Activity className="absolute -bottom-4 -right-4 w-32 h-32 opacity-5 text-primary-500" />
                <p className="text-[10px] font-black text-ink-300 uppercase tracking-[0.2em] mb-2">Total Encounters</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-5xl font-bold text-ink-900">{stats.totalEncounters}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 mb-2 uppercase">
                    <ArrowUpRight className="w-4 h-4" /> 12%
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] p-8 border border-surface-200 shadow-soft-xl relative overflow-hidden group">
                <Users className="absolute -bottom-4 -right-4 w-32 h-32 opacity-5 text-primary-500" />
                <p className="text-[10px] font-black text-ink-300 uppercase tracking-[0.2em] mb-2">Patient Records</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-5xl font-bold text-ink-900">{stats.patientCount}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 mb-2 uppercase">
                    <Plus className="w-4 h-4" /> 4
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Settings Sections */}
            <section className="bg-white rounded-[3rem] p-12 border border-surface-200 shadow-soft-xl">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center text-primary-500 shadow-inner-soft">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-ink-900">Application Preferences</h3>
              </div>
              
              <div className="space-y-6">
                <SettingsToggle icon={Bell} title="Notifications" description="Email and browser alerts for critical urgency" defaultOn />
                <SettingsToggle icon={Database} title="Real-time Sync" description="Auto-save transcripts to clinical records" defaultOn />
                <SettingsToggle icon={Globe} title="Regional Compliance" description="HIPAA and GDPR data localization" defaultOn />
              </div>
            </section>

            {/* Developer/API Access */}
            <section className="bg-surface-50 border border-surface-200 rounded-[3rem] p-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-ink-900">Developer Access</h3>
                  <p className="text-sm font-medium text-ink-400 mt-1">Integration keys for external EHR systems.</p>
                </div>
                <button className="px-6 py-2 bg-white border border-surface-200 rounded-xl text-xs font-bold text-ink-900 shadow-soft hover:bg-surface-50 transition-all">
                  Generate Key
                </button>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-surface-100 font-mono text-xs text-ink-400 flex items-center justify-between">
                <span>sk_live_********************************</span>
                <button className="text-primary-500 font-bold hover:text-primary-600">COPY</button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value, isEditing, onChange, error }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-ink-300 uppercase tracking-widest block">{label}</label>
      <div className="flex items-center gap-2 text-sm font-bold text-ink-800">
        <Icon className="w-4 h-4 text-primary-400" />
        {isEditing ? (
          <input 
            type="text" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className={`flex-1 bg-surface-50 border ${error ? "border-red-500" : "border-surface-200"} rounded-lg px-2 py-1 focus:outline-none`}
          />
        ) : (
          value
        )}
      </div>
      {isEditing && error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{error}</p>}
    </div>
  );
}

function SettingsToggle({ icon: Icon, title, description, defaultOn }: any) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between p-6 bg-surface-50 rounded-[2rem] border border-surface-100 hover:border-primary-200 transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white border border-surface-200 flex items-center justify-center text-ink-300 group-hover:text-primary-500 transition-colors shadow-sm">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-ink-900">{title}</h4>
          <p className="text-xs font-medium text-ink-400">{description}</p>
        </div>
      </div>
      <button 
        onClick={() => setOn(!on)}
        className={`w-14 h-8 rounded-full transition-all relative ${on ? 'bg-primary-500 shadow-glow' : 'bg-surface-200'}`}
      >
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-soft transition-all ${on ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

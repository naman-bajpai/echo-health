"use client";

import { useState } from "react";
import { Stethoscope, CheckCircle, Loader2, X, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";

interface DoctorAssignmentPanelProps {
  encounterId: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  onAssign: (doctorId: string, doctorName: string) => Promise<void>;
  userRole: "nurse" | "doctor";
}

export default function DoctorAssignmentPanel({
  encounterId,
  assignedDoctorId,
  assignedDoctorName,
  onAssign,
  userRole,
}: DoctorAssignmentPanelProps) {
  const { showError, showSuccess } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);

  if (userRole !== "nurse") {
    return null; // Only nurses can assign doctors
  }

  const handleAssignAnyDoctor = async () => {
    setIsAssigning(true);
    try {
      // Get the first available doctor
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "doctor")
        .limit(1)
        .single();

      if (error || !data) {
        console.error("Error finding doctor:", error);
        showError("No doctors available. Please ensure there are doctors in the system.");
        return;
      }

      await onAssign(data.id, data.full_name);
      showSuccess("Doctor assigned successfully");
    } catch (err) {
      console.error("Error assigning doctor:", err);
      showError("Failed to assign doctor. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-surface-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-ink-900">Assign Doctor</h3>
            <p className="text-xs text-ink-400">Assign a doctor to this encounter</p>
          </div>
        </div>
      </div>

      {assignedDoctorName ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-900">{assignedDoctorName}</p>
              <p className="text-xs text-emerald-700">Assigned to this encounter</p>
            </div>
          </div>
          <button
            onClick={() => onAssign("", "")}
            className="text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleAssignAnyDoctor}
          disabled={isAssigning}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAssigning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Assigning...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              <span>Assign Doctor</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

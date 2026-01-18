"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-800",
      iconColor: "text-emerald-600",
    },
    error: {
      icon: AlertCircle,
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      iconColor: "text-red-600",
    },
    info: {
      icon: Info,
      bg: "bg-primary-50",
      border: "border-primary-200",
      text: "text-primary-800",
      iconColor: "text-primary-600",
    },
  };

  const { icon: Icon, bg, border, text, iconColor } = config[type];

  return (
    <div className={`${bg} ${border} border rounded-2xl p-4 shadow-soft-xl flex items-center gap-3 animate-slide-in min-w-[300px] max-w-md`}>
      <Icon className={`w-5 h-5 ${iconColor} shrink-0`} />
      <p className={`text-sm font-bold ${text} flex-1`}>{message}</p>
      <button
        onClick={onClose}
        className={`${text} hover:opacity-70 transition-opacity`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-8 z-[9999] flex flex-col gap-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

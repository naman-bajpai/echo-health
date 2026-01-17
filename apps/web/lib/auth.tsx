"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { User } from "./types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setRole: (role: "nurse" | "doctor", name?: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple local storage key
const STORAGE_KEY = "echo_health_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const setRole = (role: "nurse" | "doctor", name?: string) => {
    const newUser: User = {
      id: `demo-${Date.now()}`,
      email: `${role}@demo.echohealth.com`,
      full_name: name || (role === "doctor" ? "Dr. Demo User" : "Demo Nurse"),
      role,
      license_number: role === "doctor" ? "MD-DEMO-001" : "RN-DEMO-001",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

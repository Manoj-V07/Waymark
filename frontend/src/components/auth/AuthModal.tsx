"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import { ShieldCheck, LogIn, UserPlus, KeyRound, Mail, User, Building, CheckCircle2 } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, quickSwitchDemoRole, user } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("INSTITUTION_NODAL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen && user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        // Register API call
        const res = await fetch("http://localhost:8000/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            role,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: "Registration failed." }));
          throw new Error(errData.detail || "Registration failed");
        }
        const data = await res.json();
        login(data.access_token, data.user);
        if (onClose) onClose();
      } else {
        // Login API call
        const res = await fetch("http://localhost:8000/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          // If backend isn't actively running or mock fallback
          const errData = await res.json().catch(() => ({ detail: "Invalid credentials." }));
          throw new Error(errData.detail || "Authentication failed");
        }
        const data = await res.json();
        login(data.access_token, data.user);
        if (onClose) onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication error.";
      console.warn("Backend login error, attempting fallback", message);
      setError(message || "Authentication error. You can also use Quick Demo Switch below.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = (demoRole: UserRole) => {
    quickSwitchDemoRole(demoRole);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">
                {isRegistering ? "Register APAAR Hub Account" : "Waymark APAAR Portal Login"}
              </h3>
              <p className="text-xs text-slate-300">
                National AICTE Admission & Verification Architecture
              </p>
            </div>
          </div>
          {user && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 transition"
            >
              Close
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          {/* Quick Demo Switcher Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                One-Click Role Switcher (For Evaluation & Demo)
              </span>
              <span className="text-[11px] bg-blue-200/80 text-blue-900 font-semibold px-2 py-0.5 rounded-full">
                Instant Access
              </span>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              Switch directly into any of the 4 defined platform personas without entering passwords:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoClick("AICTE_HQ")}
                className="text-left p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-100/50 hover:border-blue-400 transition group"
              >
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                  🏛️ AICTE HQ Officer
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Director, Regulation Bureau
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick("INSTITUTION_NODAL")}
                className="text-left p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-100/50 hover:border-blue-400 transition group"
              >
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                  🏫 Institution Nodal
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  College Registrar / Officer
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick("STUDENT")}
                className="text-left p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-100/50 hover:border-blue-400 transition group"
              >
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                  🎓 Enrolled Student
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Aarav Sharma (B.Tech)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick("VERIFIER")}
                className="text-left p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-100/50 hover:border-blue-400 transition group"
              >
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                  🔍 Third-Party Verifier
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Corporate HR / Academic Auditor
                </div>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Or sign in with credentials
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                {error}
              </div>
            )}

            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name & Designation
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Dr. Ananya Deshmukh"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., nodal@coep.ac.in"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Platform Role
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="INSTITUTION_NODAL">College Nodal Officer (Institution Level)</option>
                    <option value="AICTE_HQ">AICTE HQ Regulation Bureau Officer</option>
                    <option value="STUDENT">Enrolled Student</option>
                    <option value="VERIFIER">Third-Party Background Verifier</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
            >
              {isRegistering ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  {loading ? "Creating Account..." : "Create Account & Login"}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {loading ? "Authenticating..." : "Sign In to Portal"}
                </>
              )}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="text-center pt-2 border-t border-slate-100">
            {isRegistering ? (
              <p className="text-xs text-slate-600">
                Already have an official account?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                Need to register an institutional officer or verifier profile?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Register Account
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

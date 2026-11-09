"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import { ShieldCheck, LogIn, KeyRound, Mail, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, quickSwitchDemoRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Invalid email or password." }));
        throw new Error(errData.detail || "Authentication failed");
      }

      const data = await res.json();
      login(data.access_token, data.user);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication error.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = (role: UserRole) => {
    quickSwitchDemoRole(role);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="bg-slate-900 px-6 py-6 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AICTE Waymark APAAR Hub</h1>
            <p className="text-xs text-slate-300">
              Official Portal Sign-In • Regulation Bureau (SIH 26263)
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Quick Demo Personas */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                Quick Evaluation Personas (One-Click)
              </span>
              <span className="text-[10px] bg-blue-200/80 text-blue-900 font-semibold px-2 py-0.5 rounded-full">
                Instant Access
              </span>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              Select any of the 4 defined platform roles to evaluate permissions immediately:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSelect("AICTE_HQ")}
                className="text-left p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-100/50 hover:border-blue-400 transition"
              >
                <div className="text-xs font-bold text-slate-900">🏛️ AICTE HQ Officer</div>
                <div className="text-[10px] text-slate-500 truncate">Director, Regulation Bureau</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect("INSTITUTION_NODAL")}
                className="text-left p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-100/50 hover:border-blue-400 transition"
              >
                <div className="text-xs font-bold text-slate-900">🏫 Institution Nodal</div>
                <div className="text-[10px] text-slate-500 truncate">College Nodal Officer (COEP)</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect("STUDENT")}
                className="text-left p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-100/50 hover:border-blue-400 transition"
              >
                <div className="text-xs font-bold text-slate-900">🎓 Enrolled Student</div>
                <div className="text-[10px] text-slate-500 truncate">Aarav Sharma (B.Tech)</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect("VERIFIER")}
                className="text-left p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-100/50 hover:border-blue-400 transition"
              >
                <div className="text-xs font-bold text-slate-900">🔍 Third-Party Verifier</div>
                <div className="text-[10px] text-slate-500 truncate">Corporate HR Auditor (TCS)</div>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Or sign in with registered credentials
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                {error}
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
                  placeholder="e.g. nodal@coep.ac.in"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Authenticating..." : "Sign In to AICTE Hub"}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-600">
              Need to register a new college nodal officer or verifier profile?{" "}
              <Link href="/register" className="text-blue-600 font-semibold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

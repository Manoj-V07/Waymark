"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  GraduationCap, 
  Calendar, 
  Award, 
  FileCheck2, 
  Lock, 
  ExternalLink
} from "lucide-react";
import Link from "next/link";

interface VerifiedStudentData {
  verified: boolean;
  status: string;
  apaar_id: string;
  student_name: string;
  dob: string;
  gender: string;
  institution_name: string;
  institution_pid: string;
  institution_state: string;
  programme_name: string;
  academic_year: string;
  roll_number: string;
  abc_account_id: string;
  credits_accumulated: number;
  cgpa: number;
  eoa_status: string;
  blockchain_hash: string;
  verification_timestamp: string;
  issuer: string;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const rawApaar = searchParams.get("apaar") || "9021-4412-8873";
  const [data, setData] = useState<VerifiedStudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVerification() {
      try {
        setLoading(true);
        setError(null);
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/students/verify-credentials?apaar_id=${encodeURIComponent(rawApaar)}`);
        if (!res.ok) {
          throw new Error("Unable to retrieve student record from central academic directory.");
        }
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error verifying credentials");
      } finally {
        setLoading(false);
      }
    }
    fetchVerification();
  }, [rawApaar]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans">
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight uppercase">
              Ministry of Education • AICTE
            </h1>
            <p className="text-[11px] text-blue-300 font-medium">
              National Academic Depository (NAD) Verification Gateway
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          SSL Authenticated
        </span>
      </header>

      <main className="max-w-2xl mx-auto w-full my-8">
        {loading && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-12 text-center space-y-4 backdrop-blur-sm shadow-2xl">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-base font-bold text-white">Validating Cryptographic APAAR Record...</h3>
            <p className="text-xs text-slate-400">
              Querying central AICTE admission registry and cross-referencing SHA-256 seal.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-8 text-center space-y-3 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h3 className="text-base font-bold text-white">Verification Failed</h3>
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Success Validation Badge */}
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block mb-0.5">
                    Official Verification Confirmed
                  </span>
                  <h2 className="text-xl font-bold text-white">
                    {data.student_name}
                  </h2>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    APAAR ID: <span className="text-emerald-400 font-bold">{data.apaar_id}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Student Full Academic Credentials Card */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-400" />
                  Academic Profile & Enrolment Details
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-blue-900/40 text-blue-300 border border-blue-700/40 rounded">
                  Session {data.academic_year}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                    Enrolled Institution
                  </span>
                  <span className="font-bold text-slate-100 flex items-start gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    {data.institution_name}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    AICTE PID: {data.institution_pid} • {data.institution_state}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                    Academic Degree Programme
                  </span>
                  <span className="font-bold text-slate-100 flex items-start gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    {data.programme_name}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Roll No: {data.roll_number}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                    Date of Birth & Demographics
                  </span>
                  <span className="font-bold text-slate-100 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    {data.dob} ({data.gender})
                  </span>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                    Academic Bank of Credits (ABC)
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{data.credits_accumulated} Credits</span>
                    <span className="font-bold text-emerald-400 font-mono">CGPA: {data.cgpa}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    ID: {data.abc_account_id}
                  </div>
                </div>
              </div>

              {/* Regulatory Seal */}
              <div className="bg-blue-950/40 border border-blue-900/60 p-4 rounded-xl flex items-start gap-3">
                <FileCheck2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-blue-200">
                    AICTE Extension of Approval (EoA) Verified
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    This candidate has been admitted within the approved intake division sanctioned by AICTE. The record is cryptographically tied to the student&apos;s APAAR identity.
                  </p>
                </div>
              </div>

              {/* Cryptographic Ledger Anchor */}
              <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1 font-semibold">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    Immutable SHA-256 Ledger Hash
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    Verified: {new Date(data.verification_timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="font-mono text-[10px] bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-emerald-400/90 break-all select-all">
                  {data.blockchain_hash}
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition"
              >
                <span>Return to AICTE Waymark Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-2xl mx-auto w-full text-center pt-6 border-t border-slate-800 text-[11px] text-slate-500">
        All India Council for Technical Education (AICTE) • National Academic Depository (NAD)
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-sm">
        Loading Verification Gateway...
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

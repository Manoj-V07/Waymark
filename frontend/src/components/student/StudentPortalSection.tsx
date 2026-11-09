"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  ShieldCheck, 
  Download, 
  Share2, 
  CheckCircle, 
  GraduationCap, 
  Building2, 
  Calendar,
  Lock,
  FileCheck,
  ExternalLink,
  Maximize2
} from "lucide-react";
import Image from "next/image";

export const StudentPortalSection: React.FC = () => {
  const { user } = useAuth();
  const [consentGranted, setConsentGranted] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUri, setQrCodeDataUri] = useState<string>("");
  const [verificationUrl, setVerificationUrl] = useState<string>("");

  // Student specific mock/resolved record
  const studentData = {
    apaar_id: "9021-4412-8873",
    name: user?.full_name || "Aarav Sharma",
    dob: "2005-04-12",
    gender: "Male",
    institution: "College of Engineering Pune (COEP Technological University)",
    programme: "Bachelor of Technology in Mechanical Engineering",
    academic_year: "2026-27",
    admission_quota: "STATE_GOVT_MERIT (CAP Round 1)",
    roll_number: "COEP-ME-2026-084",
    abc_account_id: "ABC-9021-4412-8873-MH",
    credits_accumulated: 44,
    status: "ENROLLED_REGULATORY_COMPLIANT",
    blockchain_hash: "0x8fa37c92b49e1029c81b23ad49b71e30948cba4726e6f79021",
  };

  useEffect(() => {
    async function loadQrCode() {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/students/qr-code?apaar_id=${studentData.apaar_id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.qr_code_base64) {
            setQrCodeDataUri(json.qr_code_base64);
          }
          if (json.verification_url) {
            setVerificationUrl(json.verification_url);
          }
        }
      } catch (err) {
        console.error("Failed to load dynamic QR code", err);
      }
    }
    loadQrCode();
  }, [studentData.apaar_id]);

  const activeVerifyLink = verificationUrl || `http://localhost:3000/verify?apaar=${studentData.apaar_id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeVerifyLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-5 h-5 text-blue-300" />
            <span className="text-xs font-semibold tracking-wider uppercase text-blue-200">
              National Academic Depository & One Nation One Student ID
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Student APAAR ID & Credential Wallet</h2>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">
            Live cryptographic view of your verified APAAR registry, AICTE EOA intake validation, and DPDP-compliant consent logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-medium text-white transition"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-xs font-semibold text-white shadow-sm transition"
          >
            <Share2 className="w-4 h-4" />
            Share Credential
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Official APAAR ID Card */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-blue-900/50 relative overflow-hidden">
            {/* Hologram aesthetic strip */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* AICTE & MoE Emblem Header */}
            <div className="flex items-center justify-between border-b border-blue-800/60 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 block">
                  Ministry of Education, Govt of India
                </span>
                <span className="text-xs font-bold text-slate-100">
                  AICTE APAAR ID CARD
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-400 flex items-center justify-center font-bold text-xs text-blue-200">
                🇮🇳
              </div>
            </div>

            {/* Student Photo & Identity Details */}
            <div className="flex gap-4 items-center mb-5">
              <div className="w-20 h-24 rounded-lg bg-blue-900/40 border border-blue-700/60 flex flex-col items-center justify-center text-blue-300 font-bold shadow-inner">
                <GraduationCap className="w-10 h-10 mb-1 text-blue-400" />
                <span className="text-[9px] uppercase tracking-wider text-blue-300">Photo</span>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-semibold text-blue-400">Student Name</div>
                <div className="font-bold text-base text-white leading-tight">{studentData.name}</div>
                <div className="text-[11px] text-slate-300">DOB: {studentData.dob} ({studentData.gender})</div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-1">
                  <CheckCircle className="w-3 h-3" /> EOA Verified
                </div>
              </div>
            </div>

            {/* APAAR ID Number Display */}
            <div className="bg-slate-950/70 border border-blue-900/80 rounded-xl p-3 mb-5 text-center">
              <div className="text-[10px] uppercase tracking-widest text-blue-300 font-semibold mb-0.5">
                Automated Permanent Academic Account Registry
              </div>
              <div className="font-mono text-lg font-bold tracking-widest text-emerald-400">
                {studentData.apaar_id}
              </div>
            </div>

            {/* Card Footer with Functional Scannable QR */}
            <div className="flex items-center justify-between pt-3 border-t border-blue-900/60">
              <div className="space-y-0.5 text-[11px] text-slate-400">
                <div>Roll No: <span className="text-slate-200 font-medium">{studentData.roll_number}</span></div>
                <div>ABC ID: <span className="text-slate-200 font-mono text-[10px]">{studentData.abc_account_id}</span></div>
                <div className="text-[9px] text-blue-300/80 pt-0.5">Scan to verify credentials</div>
              </div>
              
              <div 
                onClick={() => setShowQrModal(true)}
                title="Click to Enlarge QR Code for Scanning"
                className="w-16 h-16 bg-white p-1 rounded-xl flex items-center justify-center shadow-lg border-2 border-blue-400/50 cursor-pointer hover:scale-105 transition group relative"
              >
                {qrCodeDataUri ? (
                  <Image
                    src={qrCodeDataUri}
                    alt="AICTE APAAR Verification QR Code"
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse text-[9px] text-slate-500 text-center font-mono">
                    QR
                  </div>
                )}
                <div className="absolute inset-0 bg-blue-950/20 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition">
                  <Maximize2 className="w-4 h-4 text-blue-900" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-600" />
              DPDP Privacy & Consent Manager
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              Under India&apos;s DPDP Act 2023, you hold full ownership of which employers or verifiers can access your academic records.
            </p>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <div className="text-xs font-semibold text-slate-800">Employer Auto-Consent</div>
                <div className="text-[11px] text-slate-500">Allow verified AICTE corporate partners to verify degree status</div>
              </div>
              <input
                type="checkbox"
                checked={consentGranted}
                onChange={(e) => setConsentGranted(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Admission & Academic Audit Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Institutional Enrolment Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Institutional Enrolment Status</h3>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                AICTE Quota Approved
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Admitted Institution</span>
                <p className="font-semibold text-slate-800">{studentData.institution}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Academic Programme</span>
                <p className="font-semibold text-slate-800">{studentData.programme}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Admission Quota Category</span>
                <p className="font-semibold text-slate-800">{studentData.admission_quota}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Academic Session</span>
                <p className="font-semibold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {studentData.academic_year}
                </p>
              </div>
            </div>
          </div>

          {/* Academic Bank of Credits (ABC) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Academic Bank of Credits (ABC) Sync</h3>
              </div>
              <span className="text-xs text-slate-500">Live DigiLocker Sync</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <div className="text-xl font-bold text-blue-600">{studentData.credits_accumulated}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Earned Credits</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <div className="text-xl font-bold text-emerald-600">8.82</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Cumulative CGPA</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <div className="text-xl font-bold text-indigo-600">4 / 8</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Semesters Completed</div>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Your credits are digitally counter-signed by COEP Autonomous Examination Cell and locked into your National Academic Depository account.
              </span>
            </div>
          </div>

          {/* Tamper-evident Audit Block */}
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Cryptographic Audit Proof (SHA-256)
              </span>
              <span className="text-[11px] bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono">
                Immutable
              </span>
            </div>
            <div className="font-mono text-xs text-emerald-400 bg-slate-950 p-3 rounded-lg border border-slate-800 break-all select-all">
              {studentData.blockchain_hash}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              This admission block was verified against the AICTE Approval Bureau master roster and sealed at batch ingestion.
            </p>
          </div>
        </div>
      </div>

      {/* High-Resolution QR Scan Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  AICTE Quick Response Verification
                </span>
                <h3 className="font-bold text-sm text-slate-900">
                  Scan to View Verified Credentials
                </h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
              <div className="w-56 h-56 bg-white p-3 rounded-2xl shadow-inner border border-slate-200 flex items-center justify-center">
                {qrCodeDataUri ? (
                  <Image
                    src={qrCodeDataUri}
                    alt="High Resolution AICTE APAAR QR"
                    width={220}
                    height={220}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="text-xs text-slate-400 animate-pulse">Generating QR...</div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-3 font-medium">
                Point any mobile camera, Google Lens, or QR scanner app at the code.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-left text-xs space-y-1">
              <div className="font-semibold text-blue-900">Direct Verification Link:</div>
              <a
                href={activeVerifyLink}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-blue-600 hover:text-blue-800 break-all flex items-center gap-1"
              >
                <span>{activeVerifyLink}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Close Scanner View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Credential Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Share Verified APAAR Credential</h3>
            <p className="text-xs text-slate-600">
              Provide this tamper-proof verification URL to employers or foreign universities for one-click instant credential verification.
            </p>
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <input
                readOnly
                value={activeVerifyLink}
                className="bg-transparent text-xs text-slate-700 w-full outline-none font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shrink-0 transition"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

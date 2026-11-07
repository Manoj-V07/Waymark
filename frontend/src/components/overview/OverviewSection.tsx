import React from "react";
import { Building2, Users, ShieldCheck, AlertTriangle } from "lucide-react";

export function OverviewSection() {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">AICTE National Admission Governance Dashboard</h2>
        <p className="text-xs text-slate-500">Live monitoring of approved intakes, APAAR identities, and regulatory compliance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">Reporting Institutions</span>
            <Building2 className="w-5 h-5 text-blue-900" />
          </div>
          <div className="text-2xl font-bold text-slate-900">8,920 / 9,840</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">90.65% Compliance rate</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">Total Approved Intake</span>
            <Users className="w-5 h-5 text-blue-900" />
          </div>
          <div className="text-2xl font-bold text-slate-900">3,200,000</div>
          <p className="text-xs text-slate-500 mt-1">Academic Year 2026-27</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">Verified APAAR Records</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">2,624,622</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">92.4% Verified</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">Regulatory Review Flags</span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">482</div>
          <p className="text-xs text-amber-600 font-medium mt-1">Requires Officer Review</p>
        </div>
      </div>

      {/* APH 2024-27 Regulatory Rule Callout */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Active AICTE APH 2024–27 Regulatory Framework
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Enrolments are automatically checked against sanctioned intakes and supernumerary quotas.
          <strong> A flag never penalizes automatically; an authorized officer decides.</strong>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="font-semibold text-blue-950">Clause 2.8(b) NRI Quota</div>
            <p className="text-xs text-slate-600 mt-1">Strictly capped at <strong>5% within approved intake</strong>.</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="font-semibold text-blue-950">Clause 2.9 FN/OCI/CIWG Quota</div>
            <p className="text-xs text-slate-600 mt-1">Supernumerary up to <strong>15% above approved intake</strong>.</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="font-semibold text-blue-950">Clause 6.42 Tuition Fee Waiver</div>
            <p className="text-xs text-slate-600 mt-1">Supernumerary <strong>5%</strong> with prior year fill &gt;= 50%.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


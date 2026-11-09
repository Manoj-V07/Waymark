"use client";

import React, { useState } from "react";
import { CheckCircle2, ShieldAlert, RefreshCw, Scale } from "lucide-react";
import { ActiveInstitution, ComplianceEvaluationResult } from "@/types";

interface ComplianceSectionProps {
  institutions: ActiveInstitution[];
  selectedInstId: string;
  setSelectedInstId: (id: string) => void;
  selectedProgId: string;
  setSelectedProgId: (id: string) => void;
}

export function ComplianceSection({
  institutions,
  selectedInstId,
  setSelectedInstId,
  selectedProgId,
  setSelectedProgId
}: ComplianceSectionProps) {
  const [evalResult, setEvalResult] = useState<ComplianceEvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const handleEvaluate = async () => {
    if (!selectedInstId || !selectedProgId) return;
    setEvaluating(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/validation/compliance/evaluate-programme?institution_id=${selectedInstId}&programme_id=${selectedProgId}&academic_year=2026-27`,
        { method: "POST" }
      );
      const data = await res.json();
      setEvalResult(data);
    } catch {
      // Fallback demonstration
      setEvalResult({
        compliant: false,
        approved_intake: 120,
        within_intake_admitted: 126,
        supernumerary_admitted: 6,
        total_enrolled: 132,
        total_allowed_capacity: 144,
        rules_applied: ["RULE_NRI_QUOTA_CAP", "RULE_INTAKE_CAP", "RULE_FN_OCI_CIWG_CAP", "RULE_TFW_CAP"],
        flags: [
          {
            rule_code: "RULE_INTAKE_CAP",
            clause: "Clause 7.4(g) - Excess Admissions Prohibited",
            severity: "CRITICAL",
            violation_message: "Total within-intake admissions (126) exceed Approved Intake (120).",
            excess_count: 6,
            indicative_penalty_clause: "APH 7.3(g) (Indicative 5x Tuition Fee per excess student)",
            recommendation: "Flag for Executive Committee review. Issue show-cause clarification notice."
          }
        ]
      });
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">AICTE Approval Process Handbook (APH 2024–27) Engine</h2>
          <p className="text-xs text-slate-500">
            Intake pool deconstruction, supernumerary quotas (FN/OCI/CIWG, TFW), and NRI caps.
          </p>
        </div>
        <button
          onClick={handleEvaluate}
          disabled={evaluating || !selectedProgId}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition disabled:opacity-50"
        >
          {evaluating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
          <span>Evaluate Roster Compliance</span>
        </button>
      </div>

      {/* Selectors */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Select Institution</label>
          <select
            value={selectedInstId}
            onChange={(e) => {
              setSelectedInstId(e.target.value);
              const inst = institutions.find(i => i.institution_id === e.target.value);
              if (inst && inst.programmes.length > 0) {
                setSelectedProgId(inst.programmes[0].programme_id);
              }
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            {institutions.map(inst => (
              <option key={inst.institution_id} value={inst.institution_id}>
                {inst.name} (PID: {inst.pid})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Programme</label>
          <select
            value={selectedProgId}
            onChange={(e) => setSelectedProgId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            {institutions
              .find(i => i.institution_id === selectedInstId)
              ?.programmes.map(p => (
                <option key={p.programme_id} value={p.programme_id}>
                  {p.name} (Sanctioned: {p.approved_intake} | Current: {p.enrolled_count})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Evaluation Results Card */}
      {evalResult && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              {evalResult.compliant ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-rose-600" />
              )}
              <div>
                <h3 className="font-bold text-slate-900">
                  {evalResult.compliant ? "Programme Fully Compliant with APH 2024–27" : "Compliance Irregularity Detected"}
                </h3>
                <p className="text-xs text-slate-500">
                  {evalResult.compliant 
                    ? "All enrolled students fit within regular sanctioned intake and supernumerary caps."
                    : `${evalResult.flags.length} regulatory flags require officer scrutiny.`}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              evalResult.compliant ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}>
              {evalResult.compliant ? "STATUS: COMPLIANT" : "STATUS: FLAGGED"}
            </span>
          </div>

          {/* Metric Gauges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xl font-bold text-slate-900 font-mono">{evalResult.approved_intake}</div>
              <div className="text-xs text-slate-500">Sanctioned Intake</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className={`text-xl font-bold font-mono ${
                evalResult.within_intake_admitted > evalResult.approved_intake ? "text-rose-600" : "text-emerald-600"
              }`}>
                {evalResult.within_intake_admitted}
              </div>
              <div className="text-xs text-slate-500">Within-Intake (Reg + NRI)</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xl font-bold text-blue-900 font-mono">{evalResult.supernumerary_admitted}</div>
              <div className="text-xs text-slate-500">Supernumerary (FN/TFW)</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xl font-bold text-slate-900 font-mono">{evalResult.total_enrolled} / {evalResult.total_allowed_capacity}</div>
              <div className="text-xs text-slate-500">Total Admitted / Max Allowed</div>
            </div>
          </div>

          {/* Flag Details Drawer */}
          {evalResult.flags.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Regulatory Violations & Explanation
              </h4>
              <div className="space-y-2">
                {evalResult.flags.map((flag, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-rose-50/50 border border-rose-200 text-sm space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-rose-900">{flag.clause}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900">
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{flag.violation_message}</p>
                    {flag.indicative_penalty_clause && (
                      <p className="text-xs text-rose-700 font-semibold mt-1">
                        Indicative Penalty: {flag.indicative_penalty_clause}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 italic mt-1">
                      Action: {flag.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


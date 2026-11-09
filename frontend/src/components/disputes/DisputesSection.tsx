"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Send,
  Gavel,
  RefreshCw
} from "lucide-react";
import { RegulatoryCaseData } from "@/types";

export function DisputesSection() {
  const [cases, setCases] = useState<RegulatoryCaseData[]>([]);
  const [selectedCase, setSelectedCase] = useState<RegulatoryCaseData | null>(null);

  // Form states
  const [responseText, setResponseText] = useState("");
  const [docRef, setDocRef] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const [decisionType, setDecisionType] = useState("EXEMPTED_MERIT");
  const [decisionRemarks, setDecisionRemarks] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const loadCases = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/cases");
      const data = await res.json();
      setCases(data);
      if (data.length > 0 && !selectedCase) {
        setSelectedCase(data[0]);
      }
    } catch {
      // Fallback demo mock
      const mockCases: RegulatoryCaseData[] = [
        {
          case_id: "c_001",
          case_number: "RC-2026-0001",
          institution_id: "inst_ai_0042",
          programme_id: "prog_cs_01",
          academic_year: "2026-27",
          rule_code: "RULE_INTAKE_CAP",
          clause_reference: "APH Clause 7.4(g)",
          severity: "CRITICAL",
          violation_summary: "Within-intake admissions exceed sanctioned limit of 120 by 6 seats.",
          excess_count: 6,
          indicative_penalty_inr: 150000,
          status: "SHOW_CAUSE_ISSUED",
          show_cause_notice: "Submit justification for admitting 6 candidates above the approved intake.",
          created_at: new Date().toISOString()
        }
      ];
      setCases(mockCases);
      setSelectedCase(mockCases[0]);
    }
  };

  useEffect(() => {
    loadCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstitutionResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !responseText) return;

    setSubmittingResponse(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${selectedCase.case_id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_response: responseText,
          supporting_doc_ref: docRef || "AFFIDAVIT_EXEMPTION_2026.pdf"
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Institution justification submitted to AICTE Regional Bureau.");
        loadCases();
      }
    } catch {
      alert("Demo: Response recorded successfully.");
      if (selectedCase) {
        selectedCase.status = "RESPONSE_SUBMITTED";
        selectedCase.institution_response = responseText;
      }
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleOfficerDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !decisionRemarks) return;

    setSubmittingDecision(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cases/${selectedCase.case_id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decisionType,
          remarks: decisionRemarks,
          officer_name: "Dr. B. K. Murthy (Regional Director)"
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(`Human officer decision recorded: ${decisionType}`);
        loadCases();
      }
    } catch {
      alert("Demo: Officer decision recorded.");
      if (selectedCase) {
        selectedCase.status = "RESOLVED_EXEMPT";
        selectedCase.officer_decision = decisionType;
        selectedCase.officer_remarks = decisionRemarks;
      }
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Regulatory Dispute & Case Workflow</h2>
          <p className="text-xs text-slate-500">
            Non-punitive human-in-the-loop dispute pipeline. A flag never penalizes automatically; an authorized officer decides.
          </p>
        </div>
        <button
          onClick={loadCases}
          className="flex items-center space-x-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Cases</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Case List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 font-semibold text-xs text-slate-700 uppercase tracking-wider">
            Active Review Cases ({cases.length})
          </div>
          <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
            {cases.map((c) => {
              const isSelected = selectedCase?.case_id === c.case_id;
              return (
                <button
                  key={c.case_id}
                  onClick={() => setSelectedCase(c)}
                  className={`w-full text-left p-4 transition ${isSelected ? "bg-blue-50/70 border-l-4 border-blue-900" : "hover:bg-slate-50"
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-xs font-bold text-blue-900">{c.case_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status.startsWith("RESOLVED")
                      ? "bg-emerald-100 text-emerald-800"
                      : c.status === "SHOW_CAUSE_ISSUED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                      }`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 truncate">{c.rule_code}</div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">{c.violation_summary}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Selected Case Detail & Actions */}
        {selectedCase ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Case Overview Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-900">{selectedCase.case_number}</span>
                  <h3 className="text-base font-bold text-slate-900">{selectedCase.clause_reference}</h3>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Indicative Penalty (APH 7.3g)</div>
                  <div className="text-sm font-mono font-bold text-rose-600">
                    ₹{selectedCase.indicative_penalty_inr?.toLocaleString() || "0"}
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-900">Official Show-Cause Summary:</div>
                <p className="text-xs text-slate-600">{selectedCase.violation_summary}</p>
                {selectedCase.show_cause_notice && (
                  <p className="text-xs text-blue-950 font-medium bg-blue-50/50 p-2 rounded border border-blue-100">
                    <strong>Notice:</strong> {selectedCase.show_cause_notice}
                  </p>
                )}
              </div>

              {/* Institution Response Display */}
              {selectedCase.institution_response && (
                <div className="p-4 rounded-lg bg-emerald-50/40 border border-emerald-200 text-sm space-y-1">
                  <div className="font-semibold text-emerald-900 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Institution Justification Submitted:</span>
                  </div>
                  <p className="text-xs text-slate-700">{selectedCase.institution_response}</p>
                  <p className="text-[11px] text-emerald-700 font-mono">Attachment: {selectedCase.supporting_doc_ref}</p>
                </div>
              )}

              {/* Officer Decision Display */}
              {selectedCase.officer_decision && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm space-y-1">
                  <div className="font-semibold text-blue-950 flex items-center space-x-1.5">
                    <Gavel className="w-4 h-4 text-blue-900" />
                    <span>Officer Decision: {selectedCase.officer_decision}</span>
                  </div>
                  <p className="text-xs text-slate-700">{selectedCase.officer_remarks}</p>
                  <p className="text-[11px] text-slate-500">Decided by: {selectedCase.resolved_by_officer}</p>
                </div>
              )}
            </div>

            {/* Workflow Action Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Institution Reply Form */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <Send className="w-4 h-4 text-blue-900" />
                  <span>Institution Nodal Officer Action</span>
                </div>
                <p className="text-xs text-slate-500">Submit justification or counselling merit list allotment evidence.</p>

                <form onSubmit={handleInstitutionResponse} className="space-y-3">
                  <textarea
                    rows={3}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Enter official institutional justification..."
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                  <input
                    type="text"
                    value={docRef}
                    onChange={(e) => setDocRef(e.target.value)}
                    placeholder="Document reference e.g. HC_WP_48192.pdf"
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                  <button
                    type="submit"
                    disabled={submittingResponse || !responseText}
                    className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {submittingResponse ? "Submitting..." : "Submit Institutional Justification"}
                  </button>
                </form>
              </div>

              {/* Box 2: AICTE Officer Decision Form */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <Gavel className="w-4 h-4 text-blue-900" />
                  <span>AICTE Officer Decision</span>
                </div>
                <p className="text-xs text-slate-500">Record final non-punitive decision into SHA-256 ledger.</p>

                <form onSubmit={handleOfficerDecision} className="space-y-3">
                  <select
                    value={decisionType}
                    onChange={(e) => setDecisionType(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="EXEMPTED_MERIT">EXEMPTED_MERIT (Court/State Order Verified)</option>
                    <option value="INTAKE_ADJUSTED">INTAKE_ADJUSTED (Deducted from Next Academic Year)</option>
                    <option value="PENALTY_CONFIRMED">PENALTY_CONFIRMED (Referred to Executive Bureau)</option>
                  </select>
                  <textarea
                    rows={3}
                    value={decisionRemarks}
                    onChange={(e) => setDecisionRemarks(e.target.value)}
                    placeholder="Enter officer evaluation reasoning & audit notes..."
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                  <button
                    type="submit"
                    disabled={submittingDecision || !decisionRemarks}
                    className="w-full py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition disabled:opacity-50"
                  >
                    {submittingDecision ? "Recording..." : "Record Official Decision"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
            Select a regulatory case on the left to view show-cause details and workflow.
          </div>
        )}
      </div>
    </div>
  );
}


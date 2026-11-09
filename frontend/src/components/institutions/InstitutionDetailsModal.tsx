"use client";

import React, { useState } from "react";
import { InstitutionDetailResponse } from "@/types";
import { 
  X, 
  Building, 
  MapPin, 
  ShieldCheck, 
  BookOpen, 
  AlertTriangle,
  History,
  Plus,
  Edit2
} from "lucide-react";

interface InstitutionDetailsModalProps {
  institutionId: string;
  onClose: () => void;
  onProgrammeAdded?: () => void;
  onIntakeUpdated?: () => void;
  isAicteHq: boolean;
}

export function InstitutionDetailsModal({
  institutionId,
  onClose,
  onProgrammeAdded,
  onIntakeUpdated,
  isAicteHq,
}: InstitutionDetailsModalProps) {
  const [data, setData] = useState<InstitutionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"programmes" | "audit">("programmes");

  // Add Programme form state
  const [showAddProg, setShowAddProg] = useState(false);
  const [newProgName, setNewProgName] = useState("");
  const [newProgLevel, setNewProgLevel] = useState("UG");
  const [newProgDuration, setNewProgDuration] = useState(4);
  const [newProgIntake, setNewProgIntake] = useState(60);
  const [progSubmitting, setProgSubmitting] = useState(false);

  // Edit Intake form state
  const [editingProgId, setEditingProgId] = useState<string | null>(null);
  const [editIntake, setEditIntake] = useState<number>(60);
  const [editNri, setEditNri] = useState<number>(3);
  const [editFnOci, setEditFnOci] = useState<number>(9);
  const [editTfw, setEditTfw] = useState<number>(3);
  const [editReason, setEditReason] = useState("");
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);

  const fetchDetails = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("waymark_auth_token") || "";
      const res = await fetch(`http://localhost:8000/api/v1/institutions/${institutionId}/details`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error("Failed to load institutional details.");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error fetching details");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  React.useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleAddProgrammeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProgSubmitting(true);
    try {
      const token = localStorage.getItem("waymark_auth_token") || "";
      const res = await fetch(`http://localhost:8000/api/v1/institutions/${institutionId}/programmes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          programme_name: newProgName,
          level: newProgLevel,
          duration_years: Number(newProgDuration),
          approved_intake: Number(newProgIntake),
          academic_year: "2026-27",
          seat_caps: {
            "NRI": Math.max(1, Math.floor(newProgIntake * 0.05)),
            "FN_OCI_CIWG": Math.max(1, Math.floor(newProgIntake * 0.15)),
            "TFW": Math.max(1, Math.floor(newProgIntake * 0.05))
          }
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: "Failed to add programme." }));
        throw new Error(errJson.detail || "Addition failed");
      }
      setShowAddProg(false);
      setNewProgName("");
      await fetchDetails();
      if (onProgrammeAdded) onProgrammeAdded();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error adding programme");
    } finally {
      setProgSubmitting(false);
    }
  };

  const handleOpenEditIntake = (prog: InstitutionDetailResponse["programmes"][0]) => {
    setEditingProgId(prog.programme_id);
    setEditIntake(prog.approved_intake);
    setEditNri(prog.seat_caps?.["NRI"]?.seats || Math.max(1, Math.floor(prog.approved_intake * 0.05)));
    setEditFnOci(prog.seat_caps?.["FN_OCI_CIWG"]?.seats || Math.max(1, Math.floor(prog.approved_intake * 0.15)));
    setEditTfw(prog.seat_caps?.["TFW"]?.seats || Math.max(1, Math.floor(prog.approved_intake * 0.05)));
    setEditReason("");
  };

  const handleUpdateIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgId) return;
    if (!editReason || editReason.trim().length < 5) {
      alert("Please provide a valid justification reason (at least 5 characters).");
      return;
    }
    setIntakeSubmitting(true);
    try {
      const token = localStorage.getItem("waymark_auth_token") || "";
      const res = await fetch(`http://localhost:8000/api/v1/institutions/${institutionId}/programmes/${editingProgId}/eoa`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          academic_year: "2026-27",
          approved_intake: Number(editIntake),
          seat_caps: {
            "NRI": Number(editNri),
            "FN_OCI_CIWG": Number(editFnOci),
            "TFW": Number(editTfw)
          },
          reason: editReason
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: "Failed to update intake." }));
        throw new Error(errJson.detail || "Update failed");
      }
      setEditingProgId(null);
      await fetchDetails();
      if (onIntakeUpdated) onIntakeUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating intake");
    } finally {
      setIntakeSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE (AICTE EoA Valid)</span>;
      case "UNDER_REVIEW":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">UNDER REVIEW</span>;
      case "NO_ADMISSION":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">NO ADMISSION (APH 7.3c)</span>;
      case "SUSPENDED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">SUSPENDED</span>;
      case "WITHDRAWN":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">WITHDRAWN</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-700">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  {loading ? "Loading Institution Master..." : data?.name}
                </h3>
                {data && getStatusBadge(data.status)}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                PID: {data?.pid || "—"} • Regional Office: {data?.regional_office || "—"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-16 text-center text-slate-400 text-sm animate-pulse">
              Retrieving institutional master record and quota matrices...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <>
              {/* Institution Metadata Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider mb-1">
                    Campus Address
                  </span>
                  <span className="font-medium text-slate-800 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    {data.address}, {data.district}, {data.state}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider mb-1">
                    Institution Category
                  </span>
                  <span className="font-bold text-slate-800">
                    {data.institution_type.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider mb-1">
                    Sanctioned Intake Capacity
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {data.total_approved_intake} seats
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider mb-1">
                    Active Student Enrolment
                  </span>
                  <span className="font-mono font-bold text-blue-700 text-sm">
                    {data.total_active_enrolled} enrolled
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-3 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("programmes")}
                  className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                    activeTab === "programmes"
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Academic Programmes & EoA Seat Caps ({data.programmes.length})
                </button>
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                    activeTab === "audit"
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  SHA-256 Administrative Audit Trail ({data.audit_history.length})
                </button>
              </div>

              {/* Tab 1: Programmes */}
              {activeTab === "programmes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Approved degree courses, sanctioned division intakes, and supernumerary caps under APH Chapter II.
                    </p>
                    {isAicteHq && (
                      <button
                        onClick={() => setShowAddProg(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Approved Programme
                      </button>
                    )}
                  </div>

                  {/* Add Programme Form (collapsible) */}
                  {showAddProg && (
                    <form onSubmit={handleAddProgrammeSubmit} className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-blue-600" />
                          New Academic Programme Allocation (EoA 2026–27)
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddProg(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-slate-700 font-semibold mb-1">Programme Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Electrical & Electronics Engineering"
                            value={newProgName}
                            onChange={(e) => setNewProgName(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Level</label>
                          <select
                            value={newProgLevel}
                            onChange={(e) => setNewProgLevel(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="UG">UG (Undergraduate)</option>
                            <option value="PG">PG (Postgraduate)</option>
                            <option value="DIPLOMA">Diploma</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Approved Intake</label>
                          <input
                            type="number"
                            required
                            min={10}
                            max={600}
                            value={newProgIntake}
                            onChange={(e) => setNewProgIntake(Number(e.target.value))}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Course Duration (Years)</label>
                          <input
                            type="number"
                            required
                            min={1}
                            max={5}
                            value={newProgDuration}
                            onChange={(e) => setNewProgDuration(Number(e.target.value))}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddProg(false)}
                          className="px-3 py-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={progSubmitting}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
                        >
                          {progSubmitting ? "Allocating..." : "Approve Programme"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Programmes Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Programme</th>
                          <th className="py-2.5 px-3">Level / Dur.</th>
                          <th className="py-2.5 px-3 text-right">Sanctioned Intake</th>
                          <th className="py-2.5 px-3 text-right">Active Enrolment</th>
                          <th className="py-2.5 px-3">Supernumerary Quotas</th>
                          {isAicteHq && <th className="py-2.5 px-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.programmes.map((p) => (
                          <React.Fragment key={p.programme_id}>
                            <tr className="hover:bg-slate-50/60 transition">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-800">{p.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{p.eoa_ref}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-slate-700">{p.level}</span>
                                <span className="text-slate-400 text-[11px]"> • {p.duration_years} yrs</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                {p.approved_intake} seats
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                                {p.active_enrolment} admitted
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                                  {Object.entries(p.seat_caps || {}).map(([cat, info]) => (
                                    <span key={cat} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                      {cat}: {info.seats}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              {isAicteHq && (
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => handleOpenEditIntake(p)}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition inline-flex items-center gap-1 font-semibold text-[11px]"
                                    title="Edit Sanctioned Intake & Supernumerary Quotas"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Amend
                                  </button>
                                </td>
                              )}
                            </tr>

                            {/* Inline Edit Intake & Caps Drawer */}
                            {editingProgId === p.programme_id && (
                              <tr>
                                <td colSpan={isAicteHq ? 6 : 5} className="bg-amber-50/40 p-4 border-b border-amber-200">
                                  <form onSubmit={handleUpdateIntakeSubmit} className="space-y-3">
                                    <div className="flex items-center justify-between pb-1 border-b border-amber-200/60">
                                      <span className="font-bold text-amber-900 text-xs">
                                        Council Intake Amendment: {p.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setEditingProgId(null)}
                                        className="text-slate-400 hover:text-slate-600"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                      <div>
                                        <label className="block font-semibold text-slate-700 mb-1">
                                          Approved Intake
                                        </label>
                                        <input
                                          type="number"
                                          min={10}
                                          max={1000}
                                          value={editIntake}
                                          onChange={(e) => setEditIntake(Number(e.target.value))}
                                          className="w-full px-2 py-1 border border-slate-300 rounded font-mono bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-semibold text-slate-700 mb-1">
                                          NRI Quota (5%)
                                        </label>
                                        <input
                                          type="number"
                                          min={0}
                                          value={editNri}
                                          onChange={(e) => setEditNri(Number(e.target.value))}
                                          className="w-full px-2 py-1 border border-slate-300 rounded font-mono bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-semibold text-slate-700 mb-1">
                                          FN / OCI Quota (15%)
                                        </label>
                                        <input
                                          type="number"
                                          min={0}
                                          value={editFnOci}
                                          onChange={(e) => setEditFnOci(Number(e.target.value))}
                                          className="w-full px-2 py-1 border border-slate-300 rounded font-mono bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-semibold text-slate-700 mb-1">
                                          TFW Quota (5%)
                                        </label>
                                        <input
                                          type="number"
                                          min={0}
                                          value={editTfw}
                                          onChange={(e) => setEditTfw(Number(e.target.value))}
                                          className="w-full px-2 py-1 border border-slate-300 rounded font-mono bg-white"
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block font-semibold text-slate-700 mb-1">
                                        Mandatory Council Amendment Justification
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        placeholder="e.g. AICTE Executive Committee approval meeting minuted ref # 2026/04"
                                        value={editReason}
                                        onChange={(e) => setEditReason(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                                      />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditingProgId(null)}
                                        className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded text-xs"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={intakeSubmitting}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-50"
                                      >
                                        {intakeSubmitting ? "Recording..." : "Record in Ledger & Save"}
                                      </button>
                                    </div>
                                  </form>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Audit History */}
              {activeTab === "audit" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>
                      Linear SHA-256 Chained Ledger. Every status shift, metadata edit, and intake adjustment is cryptographically anchored.
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {data.audit_history.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No historical administrative events logged for this institution yet.
                      </div>
                    ) : (
                      data.audit_history.map((log) => (
                        <div key={log.log_id} className="p-3 hover:bg-slate-50 transition text-xs flex flex-col md:flex-row md:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{log.action}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                {log.actor_role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Actor: <span className="font-mono text-slate-700">{log.actor_id}</span> • 
                              Time: <span className="font-mono text-slate-700">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            {log.details && (
                              <pre className="text-[10px] bg-slate-50 border border-slate-200 p-2 rounded text-slate-700 max-w-xl overflow-x-auto whitespace-pre-wrap font-mono">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Hash: {log.block_hash}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

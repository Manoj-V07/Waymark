"use client";

import React, { useState } from "react";
import { ActiveInstitution } from "@/types";
import { 
  Building2, 
  Plus, 
  Ban, 
  CheckCircle2, 
  X, 
  Building
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface InstitutionsSectionProps {
  institutions: ActiveInstitution[];
  onRefresh?: () => void;
}

export function InstitutionsSection({ institutions, onRefresh }: InstitutionsSectionProps) {
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for adding institution
  const [pid, setPid] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [district, setDistrict] = useState("");
  const [regionalOffice, setRegionalOffice] = useState("WRO");
  const institutionType = "GOVERNMENT_AIDED";

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("waymark_auth_token") || "";
      const res = await fetch("http://localhost:8000/api/v1/institutions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          pid,
          name,
          address,
          state,
          district: district || name,
          regional_office: regionalOffice,
          institution_type: institutionType,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Failed to register institution." }));
        throw new Error(errData.detail || "Registration failed");
      }

      setShowAddModal(false);
      // Reset form
      setPid("");
      setName("");
      setAddress("");
      setDistrict("");
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating institution");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (institutionId: string, instName: string) => {
    if (!confirm(`Are you sure you want to change approval status for ${instName}?`)) return;
    try {
      const token = localStorage.getItem("waymark_auth_token") || "";
      const res = await fetch(`http://localhost:8000/api/v1/institutions/${institutionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok && onRefresh) {
        onRefresh();
      }
    } catch (e) {
      console.error("Deactivation error", e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full">
              Module 1: Regulatory Master Roster
            </span>
            <span className="text-xs text-slate-400">• AICTE Extension of Approval (EoA) Store</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Approved Institutions & Sanctioned Academic Intakes
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Central directory of participating universities and technical colleges. New AICTE approvals dynamically populate in all student ingestion and quota evaluation dropdowns.
          </p>
        </div>

        {user?.role === "AICTE_HQ" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition self-start"
          >
            <Plus className="w-4 h-4" />
            Register Approved Institution
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            AICTE Approved Institutions Roster ({institutions.length} Institutions Registered)
          </div>
          <span className="text-xs text-slate-500 font-mono">Academic Session 2026–27</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Institution PID & Details</th>
                <th className="py-3 px-4">Approved Programmes</th>
                <th className="py-3 px-4 text-right">Sanctioned Intake</th>
                <th className="py-3 px-4 text-right">Active Enrolment</th>
                <th className="py-3 px-4 text-center">Regulatory Status</th>
                {user?.role === "AICTE_HQ" && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {institutions.map((inst) =>
                inst.programmes.map((p, idx) => (
                  <tr key={`${inst.institution_id}-${p.programme_id}`} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{inst.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        PID: {inst.pid} • Jurisdiction: {inst.state}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{p.name}</div>
                      <div className="text-[10px] text-slate-400">Undergraduate 4-Year B.Tech / BE</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      {p.approved_intake} seats
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-blue-700">
                      {p.enrolled_count} admitted
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center justify-center gap-1 w-fit mx-auto">
                        <CheckCircle2 className="w-3 h-3" />
                        AICTE Valid EoA
                      </span>
                    </td>

                    {user?.role === "AICTE_HQ" && (
                      <td className="py-3.5 px-4 text-right">
                        {idx === 0 && (
                          <button
                            onClick={() => handleDeactivate(inst.institution_id, inst.name)}
                            title="Set to No-Admission Status (APH Clause 7.3c)"
                            className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Institution Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Register New AICTE Approved Institution
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  AICTE Permanent ID (PID)
                </label>
                <input
                  type="text"
                  required
                  value={pid}
                  onChange={(e) => setPid(e.target.value)}
                  placeholder="e.g. 1-30948572"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Institution Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sardar Patel Institute of Technology"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Campus Address
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Munshi Nagar, Andheri West, Mumbai"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State / UT</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Regional Office</label>
                  <select
                    value={regionalOffice}
                    onChange={(e) => setRegionalOffice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="WRO">WRO (Western Regional Office)</option>
                    <option value="SRO">SRO (Southern Regional Office)</option>
                    <option value="SWRO">SWRO (South Western Office)</option>
                    <option value="NWRO">NWRO (North Western Office)</option>
                    <option value="NRO">NRO (Northern Regional Office)</option>
                    <option value="CRO">CRO (Central Regional Office)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold"
                >
                  {loading ? "Registering..." : "Approve & Issue EoA Master"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

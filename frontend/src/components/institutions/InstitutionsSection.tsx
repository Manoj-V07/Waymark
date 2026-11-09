"use client";

import React, { useState } from "react";
import { ActiveInstitution } from "@/types";
import { 
  Building2, 
  Plus, 
  CheckCircle2, 
  X, 
  Building,
  Eye,
  Edit,
  ShieldAlert,
  Search,
  Filter
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { InstitutionDetailsModal } from "./InstitutionDetailsModal";
import { EditInstitutionModal } from "./EditInstitutionModal";
import { StatusLifecycleModal } from "./StatusLifecycleModal";

interface InstitutionsSectionProps {
  institutions: ActiveInstitution[];
  onRefresh?: () => void;
}

export function InstitutionsSection({ institutions, onRefresh }: InstitutionsSectionProps) {
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>("ALL");

  // Detailed Modals state
  const [viewDetailsId, setViewDetailsId] = useState<string | null>(null);
  const [editingInstitution, setEditingInstitution] = useState<ActiveInstitution | null>(null);
  const [lifecycleInstitution, setLifecycleInstitution] = useState<ActiveInstitution | null>(null);

  // Form states for adding institution
  const [pid, setPid] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [district, setDistrict] = useState("");
  const [regionalOffice, setRegionalOffice] = useState("WRO");
  const [institutionType, setInstitutionType] = useState("GOVERNMENT");

  const isAicteHq = user?.role === "AICTE_HQ";

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
          pid: pid.trim(),
          name: name.trim(),
          address: address.trim(),
          state: state.trim(),
          district: district.trim() || name.trim(),
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

  // Filtered institutions
  const filteredInstitutions = institutions.filter((inst) => {
    const matchesSearch = 
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.pid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState === "ALL" || inst.state === selectedState;
    return matchesSearch && matchesState;
  });

  const uniqueStates = Array.from(new Set(institutions.map((i) => i.state))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full">
              Module 1: Institution Master Management
            </span>
            <span className="text-xs text-slate-400">• Regulatory Approval & Intake Repository</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Approved Institutions & Sanctioned Academic Intakes
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Central repository of AICTE-approved institutions, academic programmes, and supernumerary quotas. Provides full lifecycle administration, intake modifications, and immutable audit logs.
          </p>
        </div>

        {isAicteHq && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition self-start"
          >
            <Plus className="w-4 h-4" />
            Register New Institution
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Institution Name, PID, or State..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All States / UTs ({uniqueStates.length})</option>
            {uniqueStates.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            AICTE Approved Institutions Roster ({filteredInstitutions.length} Institutions Displayed)
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
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No approved institutions found matching query.
                  </td>
                </tr>
              ) : (
                filteredInstitutions.map((inst) =>
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
                        <div className="text-[10px] text-slate-400">Sanctioned Intake Division</div>
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
                          AICTE Approved
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {idx === 0 && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewDetailsId(inst.institution_id)}
                              title="View Institution Profile & Seat Caps"
                              className="px-2 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition font-semibold text-[11px] flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Details
                            </button>

                            {isAicteHq && (
                              <>
                                <button
                                  onClick={() => setEditingInstitution(inst)}
                                  title="Edit Institutional Information"
                                  className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setLifecycleInstitution(inst)}
                                  title="Manage Status & Lifecycle (APH 7.3c)"
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )
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
                  Institution Legal Name
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution Classification</label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="GOVERNMENT">Government College / University</option>
                  <option value="GOVERNMENT_AIDED">Government Aided Autonomous</option>
                  <option value="PRIVATE_UNAIDED">Private / Self-Financing</option>
                  <option value="DEEMED_UNIVERSITY">Deemed-to-be University</option>
                  <option value="CENTRAL_UNIVERSITY">Central University</option>
                </select>
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

      {/* Details Modal */}
      {viewDetailsId && (
        <InstitutionDetailsModal
          institutionId={viewDetailsId}
          onClose={() => setViewDetailsId(null)}
          isAicteHq={isAicteHq}
          onProgrammeAdded={() => {
            if (onRefresh) onRefresh();
          }}
          onIntakeUpdated={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Edit Institution Modal */}
      {editingInstitution && (
        <EditInstitutionModal
          institution={{
            institution_id: editingInstitution.institution_id,
            pid: editingInstitution.pid,
            name: editingInstitution.name,
            state: editingInstitution.state
          }}
          onClose={() => setEditingInstitution(null)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Lifecycle Status Modal */}
      {lifecycleInstitution && (
        <StatusLifecycleModal
          institution={{
            institution_id: lifecycleInstitution.institution_id,
            pid: lifecycleInstitution.pid,
            name: lifecycleInstitution.name,
            status: "ACTIVE"
          }}
          onClose={() => setLifecycleInstitution(null)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}

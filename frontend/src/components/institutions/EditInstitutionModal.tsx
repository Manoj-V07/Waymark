"use client";

import React, { useState } from "react";
import { X, Edit } from "lucide-react";

interface EditInstitutionModalProps {
  institution: {
    institution_id: string;
    pid: string;
    name: string;
    address?: string;
    state?: string;
    district?: string;
    regional_office?: string;
    institution_type?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditInstitutionModal({
  institution,
  onClose,
  onSuccess
}: EditInstitutionModalProps) {
  const [name, setName] = useState(institution.name);
  const [address, setAddress] = useState(institution.address || "");
  const [state, setState] = useState(institution.state || "Maharashtra");
  const [district, setDistrict] = useState(institution.district || "");
  const [regionalOffice, setRegionalOffice] = useState(institution.regional_office || "WRO");
  const [institutionType, setInstitutionType] = useState(institution.institution_type || "GOVERNMENT_AIDED");
  const [amendmentReason, setAmendmentReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendmentReason || amendmentReason.trim().length < 5) {
      setError("Please provide a valid amendment justification reason (at least 5 characters).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("waymark_auth_token") || "";
      const res = await fetch(`http://localhost:8000/api/v1/institutions/${institution.institution_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          address,
          state,
          district: district || name,
          regional_office: regionalOffice,
          institution_type: institutionType,
          amendment_reason: amendmentReason.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: "Failed to update institution." }));
        throw new Error(errJson.detail || "Update failed");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving changes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">
              Edit Institutional Master Record
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Permanent ID (PID)</label>
            <input
              type="text"
              disabled
              value={institution.pid}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Institution Legal Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Campus Address</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
              <label className="block font-semibold text-slate-700 mb-1">District</label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1">
            <label className="block font-bold text-amber-900">
              Mandatory Amendment Justification (Audited)
            </label>
            <p className="text-[10px] text-amber-700">
              Recorded cryptographically into the SHA-256 ledger with officer ID and timestamp.
            </p>
            <textarea
              required
              rows={2}
              value={amendmentReason}
              onChange={(e) => setAmendmentReason(e.target.value)}
              placeholder="e.g. Council resolution ref AICTE/REG/2026 approving change of campus name and address."
              className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold"
            >
              {loading ? "Recording Changes..." : "Commit Update to Ledger"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

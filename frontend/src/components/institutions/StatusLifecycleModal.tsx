"use client";

import React, { useState } from "react";
import { X, ShieldAlert } from "lucide-react";

interface StatusLifecycleModalProps {
  institution: {
    institution_id: string;
    pid: string;
    name: string;
    status: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function StatusLifecycleModal({
  institution,
  onClose,
  onSuccess
}: StatusLifecycleModalProps) {
  const [targetStatus, setTargetStatus] = useState<string>("UNDER_REVIEW");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statuses = [
    { value: "ACTIVE", label: "ACTIVE — AICTE Extension of Approval Valid", desc: "Full admission permissions active." },
    { value: "UNDER_REVIEW", label: "UNDER_REVIEW — Regulatory Inquiry Ongoing", desc: "Flagged for scrutiny; intakes frozen." },
    { value: "NO_ADMISSION", label: "NO_ADMISSION — Penalty Under APH Clause 7.3(c)", desc: "Admission intake halted for current academic session." },
    { value: "SUSPENDED", label: "SUSPENDED — Temporary Injunction / Investigation", desc: "All portal actions halted pending court/committee decree." },
    { value: "WITHDRAWN", label: "WITHDRAWN — AICTE Approval Relinquished / Revoked", desc: "De-affiliated. Retained as immutable archive." }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setError("Please provide a valid statutory justification (at least 5 characters).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("waymark_auth_token") || "";
      const res = await fetch(`http://localhost:8000/api/v1/institutions/${institution.institution_id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          status: targetStatus,
          reason: reason.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: "Failed to transition status." }));
        throw new Error(errJson.detail || "Status transition failed");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error executing transition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base text-slate-900">
              Institutional Status & Lifecycle Transition
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

        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1">
          <div className="font-bold text-slate-900">{institution.name}</div>
          <div className="text-slate-500 font-mono">
            PID: {institution.pid} • Current Status:{" "}
            <span className="font-bold text-slate-800">{institution.status}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Target Lifecycle Status
            </label>
            <div className="space-y-2">
              {statuses.map((s) => (
                <label
                  key={s.value}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    targetStatus === s.value
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="targetStatus"
                    value={s.value}
                    checked={targetStatus === s.value}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-800 text-xs">{s.label}</div>
                    <div className="text-[11px] text-slate-500">{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1">
            <label className="block font-bold text-amber-900">
              Regulatory Justification / Clause Reference (Mandatory)
            </label>
            <p className="text-[10px] text-amber-700">
              Permanently recorded in the tamper-evident audit ledger with officer credential. Records are never deleted.
            </p>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Non-compliance with supernumerary intake quotas identified under APH Chapter VII. Executive Council ordered No-Admission status for session 2026-27."
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
              {loading ? "Recording in Ledger..." : "Apply Status Transition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React from "react";
import { ActiveInstitution } from "@/types";

interface InstitutionsSectionProps {
  institutions: ActiveInstitution[];
}

export function InstitutionsSection({ institutions }: InstitutionsSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-slate-900">Participating Institutions & Intake Audit</h2>
          <p className="text-xs text-slate-500">Live monitoring of Approved vs Admitted strengths</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Institution PID & Name</th>
              <th className="px-6 py-3">Programme</th>
              <th className="px-6 py-3">Approved Intake</th>
              <th className="px-6 py-3">Admitted</th>
              <th className="px-6 py-3">Flags</th>
              <th className="px-6 py-3">Compliance Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {institutions.map((inst) =>
              inst.programmes.map((p) => (
                <tr key={p.programme_id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{inst.name}</div>
                    <div className="text-xs text-slate-400">PID: {inst.pid} • {inst.state}</div>
                  </td>
                  <td className="px-6 py-4">{p.name}</td>
                  <td className="px-6 py-4 font-mono">{p.approved_intake}</td>
                  <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                    {p.enrolled_count}
                  </td>
                  <td className="px-6 py-4">0</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Compliant
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


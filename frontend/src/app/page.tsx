"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { OverviewSection } from "@/components/overview/OverviewSection";
import { UploadSection } from "@/components/upload/UploadSection";
import { DisputesSection } from "@/components/disputes/DisputesSection";
import { ValidatorSection } from "@/components/validator/ValidatorSection";
import { InstitutionsSection } from "@/components/institutions/InstitutionsSection";
import { TabType, ActiveInstitution } from "@/types";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [institutions, setInstitutions] = useState<ActiveInstitution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState("");
  const [selectedProgId, setSelectedProgId] = useState("");

  const loadInstitutions = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/institutions/active");
      const data = await res.json();
      setInstitutions(data);
      if (data.length > 0) {
        setSelectedInstId(data[0].institution_id);
        if (data[0].programmes.length > 0) {
          setSelectedProgId(data[0].programmes[0].programme_id);
        }
      }
    } catch {
      setInstitutions([
        {
          institution_id: "inst_ai_0042",
          pid: "1-10293847",
          name: "College of Engineering Pune",
          state: "Maharashtra",
          programmes: [
            {
              programme_id: "prog_cs_01",
              name: "Computer Engineering",
              approved_intake: 120,
              enrolled_count: 4
            }
          ]
        }
      ]);
    }
  };

  useEffect(() => {
    loadInstitutions();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
            <span>AICTE Central Portal</span>
            <span>/</span>
            <span className="text-blue-900 font-semibold capitalize">{activeTab}</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Gateway Connected
            </span>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900">Dr. R. K. Sharma</div>
              <div className="text-[10px] text-slate-400">Institutional Nodal Officer</div>
            </div>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto w-full">
          {activeTab === "overview" && <OverviewSection />}

          {activeTab === "upload" && (
            <UploadSection 
              institutions={institutions}
              selectedInstId={selectedInstId}
              setSelectedInstId={setSelectedInstId}
              selectedProgId={selectedProgId}
              setSelectedProgId={setSelectedProgId}
              onUploadSuccess={loadInstitutions}
            />
          )}

          {activeTab === "disputes" && <DisputesSection />}

          {activeTab === "validator" && <ValidatorSection />}

          {activeTab === "institutions" && <InstitutionsSection institutions={institutions} />}
        </main>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { 
  BarChart3, 
  UploadCloud, 
  ShieldCheck, 
  Building2, 
  CheckCircle,
  Gavel,
  Scale,
  Sparkles
} from "lucide-react";
import { TabType } from "@/types";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    {
      id: "overview" as TabType,
      label: "National Overview",
      description: "Macro metrics & compliance",
      icon: BarChart3
    },
    {
      id: "upload" as TabType,
      label: "Student Ingestion",
      description: "Batch Excel/CSV uploader",
      icon: UploadCloud
    },
    {
      id: "compliance" as TabType,
      label: "Regulatory Engine",
      description: "APH 2024-27 intake pools",
      icon: Scale
    },
    {
      id: "anomalies" as TabType,
      label: "Demographic Anomalies",
      description: "TF-IDF near-duplicate detector",
      icon: Sparkles
    },
    {
      id: "disputes" as TabType,
      label: "Regulatory Disputes",
      description: "Show-cause & officer review",
      icon: Gavel
    },
    {
      id: "validator" as TabType,
      label: "APAAR ID Validator",
      description: "Format & Verhoeff check",
      icon: ShieldCheck
    },
    {
      id: "institutions" as TabType,
      label: "Institutions & Intake",
      description: "EoA approvals vs enrolled",
      icon: Building2
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 z-40 shadow-sm shrink-0">
      <div>
        <div className="p-5 border-b border-slate-200 flex items-center space-x-3">
          <div className="bg-blue-900 text-white font-bold p-2 rounded-lg text-sm tracking-wider shadow-sm">
            AICTE
          </div>
          <div>
            <h1 className="text-base font-bold text-blue-950 leading-tight">Waymark APAAR</h1>
            <p className="text-[11px] text-slate-500 font-medium">Regulation Bureau • SIH 26263</p>
          </div>
        </div>

        <div className="px-3 py-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Navigation Menu
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-start space-x-3 px-3 py-2.5 rounded-lg text-left transition ${
                    isActive
                      ? "bg-blue-50 text-blue-900 font-semibold border-l-4 border-blue-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isActive ? "text-blue-900" : "text-slate-400"}`} />
                  <div>
                    <div className="text-sm">{item.label}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center space-x-2 text-xs text-slate-600 mb-1">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-900">APH 2024–27 Rules Active</span>
        </div>
        <p className="text-[11px] text-slate-400">
          SHA-256 Audit Chain verified & operational.
        </p>
      </div>
    </aside>
  );
}

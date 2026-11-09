"use client";

import React, { useState } from "react";
import { 
  BarChart3, 
  UploadCloud, 
  ShieldCheck, 
  Building2, 
  CheckCircle,
  Gavel, 
  Scale, 
  Sparkles,
  GraduationCap,
  FileCheck2,
  Database,
  Layers,
  LogOut,
  UserCheck,
  ChevronDown
} from "lucide-react";
import { TabType, UserRole } from "@/types";
import { useAuth, DEMO_USERS } from "@/context/AuthContext";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenAuthModal: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onOpenAuthModal }: SidebarProps) {
  const { user, logout, quickSwitchDemoRole } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  // Role-based navigation matrix
  const allMenuItems = [
    {
      id: "overview" as TabType,
      label: "National Overview",
      description: "Macro metrics & compliance",
      icon: BarChart3,
      roles: ["AICTE_HQ"] as UserRole[],
    },
    {
      id: "upload" as TabType,
      label: "Student Ingestion",
      description: "Batch Excel/CSV uploader",
      icon: UploadCloud,
      roles: ["AICTE_HQ", "INSTITUTION_NODAL"] as UserRole[],
    },
    {
      id: "compliance" as TabType,
      label: "Regulatory Engine",
      description: "APH 2024-27 intake pools",
      icon: Scale,
      roles: ["AICTE_HQ", "INSTITUTION_NODAL"] as UserRole[],
    },
    {
      id: "anomalies" as TabType,
      label: "Demographic Anomalies",
      description: "TF-IDF near-duplicate detector",
      icon: Sparkles,
      roles: ["AICTE_HQ"] as UserRole[],
    },
    {
      id: "disputes" as TabType,
      label: "Regulatory Disputes",
      description: "Show-cause & officer review",
      icon: Gavel,
      roles: ["AICTE_HQ", "INSTITUTION_NODAL"] as UserRole[],
    },
    {
      id: "validator" as TabType,
      label: "APAAR ID Validator",
      description: "Format & Verhoeff check",
      icon: ShieldCheck,
      roles: ["AICTE_HQ", "INSTITUTION_NODAL", "VERIFIER"] as UserRole[],
    },
    {
      id: "institutions" as TabType,
      label: "Institutions & Intake",
      description: "EoA approvals vs enrolled",
      icon: Building2,
      roles: ["AICTE_HQ"] as UserRole[],
    },
    {
      id: "repository" as TabType,
      label: "Student Ledger",
      description: "Central repository queries",
      icon: Database,
      roles: ["AICTE_HQ", "INSTITUTION_NODAL"] as UserRole[],
    },
    {
      id: "audit_ledger" as TabType,
      label: "Audit Ledger",
      description: "SHA-256 linear chain",
      icon: Layers,
      roles: ["AICTE_HQ"] as UserRole[],
    },
    {
      id: "student_portal" as TabType,
      label: "APAAR Student Card",
      description: "Identity & consent wallet",
      icon: GraduationCap,
      roles: ["STUDENT", "AICTE_HQ"] as UserRole[],
    },
    {
      id: "verifier_portal" as TabType,
      label: "Credential Verification",
      description: "Third-party audit & DPDP SLA",
      icon: FileCheck2,
      roles: ["VERIFIER", "AICTE_HQ"] as UserRole[],
    },
  ];

  const currentRole = user?.role || "AICTE_HQ";
  const visibleMenuItems = allMenuItems.filter((item) => item.roles.includes(currentRole));

  // Role tag styling
  const roleBadgeStyle = {
    AICTE_HQ: "bg-purple-100 text-purple-800 border-purple-200",
    INSTITUTION_NODAL: "bg-blue-100 text-blue-800 border-blue-200",
    STUDENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
    VERIFIER: "bg-amber-100 text-amber-800 border-amber-200",
  }[currentRole];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 z-40 shadow-sm shrink-0">
      <div>
        {/* Brand header */}
        <div className="p-4 border-b border-slate-200 flex items-center space-x-3">
          <div className="bg-blue-900 text-white font-bold p-2 rounded-lg text-sm tracking-wider shadow-sm">
            AICTE
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-blue-950 leading-tight truncate">Waymark APAAR</h1>
            <p className="text-[11px] text-slate-500 font-medium">Regulation Bureau • SIH 26263</p>
          </div>
        </div>

        {/* Current Active Persona & Switcher */}
        <div className="p-3 border-b border-slate-100 bg-slate-50 relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Role Persona
            </span>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-0.5"
            >
              Switch <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadgeStyle}`}>
              {currentRole.replace("_", " ")}
            </span>
            <span className="text-xs font-semibold text-slate-800 truncate" title={user?.full_name}>
              {user?.full_name || "Guest Officer"}
            </span>
          </div>

          {/* Role Switching Dropdown */}
          {showRoleMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 mx-2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 space-y-1 animate-in fade-in zoom-in-95">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                Select Persona to Demo
              </div>
              {(Object.keys(DEMO_USERS) as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    quickSwitchDemoRole(r);
                    setShowRoleMenu(false);
                    // switch tab appropriately
                    if (r === "STUDENT") setActiveTab("student_portal");
                    else if (r === "VERIFIER") setActiveTab("verifier_portal");
                    else if (r === "INSTITUTION_NODAL") setActiveTab("upload");
                    else setActiveTab("overview");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                    currentRole === r
                      ? "bg-blue-50 text-blue-900 font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{r.replace("_", " ")}</span>
                  {currentRole === r && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Navigation Menu */}
        <div className="px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Authorized Workspaces
          </div>
          <nav className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-start space-x-3 px-3 py-2 rounded-lg text-left transition ${
                    isActive
                      ? "bg-blue-50 text-blue-900 font-semibold border-l-4 border-blue-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-blue-900" : "text-slate-400"}`} />
                  <div className="min-w-0">
                    <div className="text-xs truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal truncate">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User profile card & Logout Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {user?.full_name || "AICTE User"}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email || "officer@aicte.gov.in"}</div>
            </div>
          </div>
          <button
            onClick={() => onOpenAuthModal()}
            title="Switch Account / Login Details"
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-200 rounded-md transition"
          >
            <UserCheck className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}

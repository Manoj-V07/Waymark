"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { OverviewSection } from "@/components/overview/OverviewSection";
import { UploadSection } from "@/components/upload/UploadSection";
import { ComplianceSection } from "@/components/compliance/ComplianceSection";
import { AnomaliesSection } from "@/components/anomalies/AnomaliesSection";
import { DisputesSection } from "@/components/disputes/DisputesSection";
import { ValidatorSection } from "@/components/validator/ValidatorSection";
import { InstitutionsSection } from "@/components/institutions/InstitutionsSection";
import { RepositorySection } from "@/components/repository/RepositorySection";
import { AuditLedgerSection } from "@/components/audit/AuditLedgerSection";
import { StudentPortalSection } from "@/components/student/StudentPortalSection";
import { VerifierPortalSection } from "@/components/verifier/VerifierPortalSection";
import { AuthModal } from "@/components/auth/AuthModal";
import { TabType, ActiveInstitution } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { UserCircle, LogIn } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [institutions, setInstitutions] = useState<ActiveInstitution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState("");
  const [selectedProgId, setSelectedProgId] = useState("");

  // Sync initial tab when user role changes
  useEffect(() => {
    if (user?.role === "STUDENT") {
      setActiveTab("student_portal");
    } else if (user?.role === "VERIFIER") {
      setActiveTab("verifier_portal");
    } else if (user?.role === "INSTITUTION_NODAL") {
      setActiveTab("upload");
    } else {
      setActiveTab("overview");
    }
  }, [user?.role]);

  const loadInstitutions = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/institutions/active");
      if (!res.ok) throw new Error("Backend offline");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setInstitutions(data);
        // Only set default if currently empty or not in data
        if (!selectedInstId || !data.some((i: ActiveInstitution) => i.institution_id === selectedInstId)) {
          setSelectedInstId(data[0].institution_id);
          if (data[0].programmes && data[0].programmes.length > 0) {
            setSelectedProgId(data[0].programmes[0].programme_id);
          }
        }
      } else {
        throw new Error("No institutions returned");
      }
    } catch {
      // Robust multi-institution fallback for demo/offline
      const fallbackData: ActiveInstitution[] = [
        {
          institution_id: "inst_ai_0042",
          pid: "1-10293847",
          name: "College of Engineering Pune (COEP)",
          state: "Maharashtra",
          programmes: [
            {
              programme_id: "prog_cs_01",
              name: "Computer Engineering",
              approved_intake: 120,
              enrolled_count: 4,
            },
            {
              programme_id: "prog_me_02",
              name: "Mechanical Engineering",
              approved_intake: 60,
              enrolled_count: 1,
            },
          ],
        },
        {
          institution_id: "inst_ai_0043",
          pid: "1-20938491",
          name: "Veermata Jijabai Technological Institute (VJTI)",
          state: "Maharashtra",
          programmes: [
            {
              programme_id: "prog_it_03",
              name: "Information Technology",
              approved_intake: 60,
              enrolled_count: 0,
            },
          ],
        },
      ];
      setInstitutions(fallbackData);
      if (!selectedInstId) {
        setSelectedInstId(fallbackData[0].institution_id);
        setSelectedProgId(fallbackData[0].programmes[0].programme_id);
      }
    }
  };

  useEffect(() => {
    loadInstitutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* Role-Aware Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
            <span>AICTE Waymark Hub</span>
            <span>/</span>
            <span className="text-blue-900 font-semibold capitalize">
              {activeTab.replace("_", " ")}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Gateway Active
            </span>

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                    {user.full_name}
                  </div>
                  <div className="text-[10px] text-blue-700 font-semibold">
                    {user.role.replace("_", " ")}
                  </div>
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-blue-600 transition"
                  title="Switch Persona / User Account"
                >
                  <UserCircle className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Section Rendering */}
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

          {activeTab === "compliance" && (
            <ComplianceSection
              institutions={institutions}
              selectedInstId={selectedInstId}
              setSelectedInstId={setSelectedInstId}
              selectedProgId={selectedProgId}
              setSelectedProgId={setSelectedProgId}
            />
          )}

          {activeTab === "anomalies" && (
            <AnomaliesSection
              institutions={institutions}
              selectedInstId={selectedInstId}
              setSelectedInstId={setSelectedInstId}
              selectedProgId={selectedProgId}
              setSelectedProgId={setSelectedProgId}
            />
          )}

          {activeTab === "disputes" && <DisputesSection />}

          {activeTab === "validator" && <ValidatorSection />}

          {activeTab === "institutions" && (
            <InstitutionsSection institutions={institutions} onRefresh={loadInstitutions} />
          )}

          {activeTab === "repository" && <RepositorySection />}

          {activeTab === "audit_ledger" && <AuditLedgerSection />}

          {activeTab === "student_portal" && <StudentPortalSection />}

          {activeTab === "verifier_portal" && <VerifierPortalSection />}
        </main>
      </div>

      {/* RBAC Login / Register / Persona Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

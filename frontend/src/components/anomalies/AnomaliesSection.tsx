"use client";

import React, { useState } from "react";
import { Users2, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { ActiveInstitution, AnomalyDetectionResult } from "@/types";

interface AnomaliesSectionProps {
  institutions: ActiveInstitution[];
  selectedInstId: string;
  setSelectedInstId: (id: string) => void;
  selectedProgId: string;
  setSelectedProgId: (id: string) => void;
}

export function AnomaliesSection({
  institutions,
  selectedInstId,
  setSelectedInstId,
  selectedProgId,
  setSelectedProgId
}: AnomaliesSectionProps) {
  const [anomalyResult, setAnomalyResult] = useState<AnomalyDetectionResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [threshold, setThreshold] = useState(0.80);

  const handleScan = async () => {
    if (!selectedProgId) return;
    setScanning(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/anomalies/detect-near-duplicates?programme_id=${selectedProgId}&threshold=${threshold}`,
        { method: "POST" }
      );
      const data = await res.json();
      setAnomalyResult(data);
    } catch {
      // Demo simulated response
      setAnomalyResult({
        programme_id: selectedProgId,
        candidates_analyzed: 4,
        anomalies_detected: 1,
        matches: [
          {
            rule_code: "RULE_NEAR_DUPLICATE_NAME",
            severity: "WARNING",
            confidence_score: 0.95,
            candidate_a: {
              student_id: "s1",
              name: "Arun Kumar",
              dob: "2005-05-12",
              roll_no: "2026-CS-011",
              apaar_masked: "XXXXXXXX9012"
            },
            candidate_b: {
              student_id: "s2",
              name: "Arunkumar",
              dob: "2005-05-12",
              roll_no: "2026-CS-088",
              apaar_masked: "PENDING"
            },
            violation_message: "Near-duplicate demographic match (95.0%): 'Arun Kumar' and 'Arunkumar' share DOB 2005-05-12.",
            recommendation: "Advisory only. Request institutional nodal officer review to prevent duplicate registration under pending APAAR."
          }
        ]
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Demographic Anomaly & Near-Duplicate Detector</h2>
          <p className="text-xs text-slate-500">
            Powered by scikit-learn TF-IDF & SequenceMatcher. Flags students enrolled under conflicting or pending APAAR IDs.
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning || !selectedProgId}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition disabled:opacity-50"
        >
          {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>Run TF-IDF Demographic Scan</span>
        </button>
      </div>

      {/* Selectors & Sensitivity Slider */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Select Institution</label>
          <select
            value={selectedInstId}
            onChange={(e) => {
              setSelectedInstId(e.target.value);
              const inst = institutions.find(i => i.institution_id === e.target.value);
              if (inst && inst.programmes.length > 0) {
                setSelectedProgId(inst.programmes[0].programme_id);
              }
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            {institutions.map(inst => (
              <option key={inst.institution_id} value={inst.institution_id}>
                {inst.name} (PID: {inst.pid})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Programme</label>
          <select
            value={selectedProgId}
            onChange={(e) => setSelectedProgId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            {institutions
              .find(i => i.institution_id === selectedInstId)
              ?.programmes.map(p => (
                <option key={p.programme_id} value={p.programme_id}>
                  {p.name} ({p.enrolled_count} active students)
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Similarity Threshold: {Math.round(threshold * 100)}%
          </label>
          <input
            type="range"
            min="0.50"
            max="0.95"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full mt-2"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>50% (Loose)</span>
            <span>80% (Recommended)</span>
            <span>95% (Strict)</span>
          </div>
        </div>
      </div>

      {/* Detection Results */}
      {anomalyResult && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Users2 className="w-5 h-5 text-blue-900" />
              <div>
                <h3 className="font-bold text-slate-900">Demographic Collision Analysis</h3>
                <p className="text-xs text-slate-500">
                  {anomalyResult.candidates_analyzed} students scanned • {anomalyResult.anomalies_detected} suspicious pairs detected
                </p>
              </div>
            </div>
          </div>

          {anomalyResult.matches.length > 0 ? (
            <div className="space-y-3">
              {anomalyResult.matches.map((match, i) => (
                <div key={i} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-slate-900 text-sm">
                        Confidence Score: {Math.round(match.confidence_score * 100)}% Match
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                      {match.rule_code}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700">{match.violation_message}</p>

                  {/* Compared Candidates Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <div className="font-semibold text-slate-900">Candidate A:</div>
                      <div>Name: <span className="font-mono">{match.candidate_a.name}</span></div>
                      <div>DOB: <span className="font-mono">{match.candidate_a.dob}</span></div>
                      <div>Roll No: <span className="font-mono">{match.candidate_a.roll_no || "N/A"}</span></div>
                      <div>APAAR: <span className="font-mono">{match.candidate_a.apaar_masked || "N/A"}</span></div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <div className="font-semibold text-slate-900">Candidate B:</div>
                      <div>Name: <span className="font-mono">{match.candidate_b.name}</span></div>
                      <div>DOB: <span className="font-mono">{match.candidate_b.dob}</span></div>
                      <div>Roll No: <span className="font-mono">{match.candidate_b.roll_no || "N/A"}</span></div>
                      <div>APAAR: <span className="font-mono">{match.candidate_b.apaar_masked || "N/A"}</span></div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    <strong>Notice:</strong> {match.recommendation}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              Zero demographic collisions found for this programme roster at {Math.round(threshold * 100)}% threshold.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


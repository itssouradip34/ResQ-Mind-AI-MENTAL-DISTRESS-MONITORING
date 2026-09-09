import React, { useEffect, useState } from 'react';
import { Settings, Shield, Cpu, TestTube, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { ModeBadge } from '../../components/ModeBadge';
import { DisclaimerBadge } from '../../components/DisclaimerBadge';

export const AdminSystem: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiRequest('/admin/metrics')
      .then(res => {
        setMetrics(res);
        setLoading(false);
      })
      .catch(err => {
        console.error("Admin metrics error:", err);
        setLoading(false);
      });
  }, []);

  const capabilityTable = [
    { capability: "Multilingual text sentiment/emotion", real: "Yes (Multilingual NLP)", mode: "real" },
    { capability: "Speech prosody extraction", real: "Yes (Pitch/pause ratio pipeline)", mode: "real (synthetic audio)" },
    { capability: "DDI fusion + Welford baseline + velocity", real: "Yes (Deterministic engine)", mode: "real" },
    { capability: "Trajectory forecast model", real: "Yes (Toy-scale linear AR)", mode: "real (research estimate)" },
    { capability: "Explainability risk cards", real: "Yes (Weight extraction)", mode: "real" },
    { capability: "Conversational assistant", real: "Templated decision-tree", mode: "simulated (chat framing)" },
    { capability: "NHAA (14566) docket integration", real: "API Stub (/integrations/nhaa)", mode: "simulated" },
    { capability: "Government Single Sign-On (SSO)", real: "Not built", mode: "simulated" },
    { capability: "Real Telephony / IVRS", real: "Not built", mode: "simulated" }
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-6 h-6 text-slate-700" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Transparency & Model Governance</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Auditable metrics, real vs. simulated capability status, and operational fairness telemetry.
          </p>
        </div>

        <DisclaimerBadge />
      </div>

      {/* Operational Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Abstention Rate</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{metrics.abstention_rate_pct}%</div>
            <div className="text-[10px] text-slate-500">Uncertainty / high variance</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">False Positive Rate</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{metrics.false_positive_rate_pct}%</div>
            <div className="text-[10px] text-slate-500">Human counsellor marked</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Victims Enrolled</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{metrics.total_monitored_victims}</div>
            <div className="text-[10px] text-slate-500">Synthetic cohorts</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Check-Ins</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{metrics.total_checkins_logged}</div>
            <div className="text-[10px] text-slate-500">Multilingual records</div>
          </div>
        </div>
      )}

      {/* Real vs. Simulated Capability Separation Table (PRD §10) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Real vs. Simulated System Capabilities (PRD §10)</h3>
            <p className="text-xs text-slate-500">Full transparency regarding implemented engines vs. prototype stubs.</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-mono font-semibold">
            Zero Mock Concealment
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Platform Capability</th>
                <th className="p-3">Implementation in Prototype</th>
                <th className="p-3">Mode Label & UI Treatment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {capabilityTable.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">{row.capability}</td>
                  <td className="p-3 text-slate-600">{row.real}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      row.mode.startsWith("real")
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-purple-50 text-purple-800 border-purple-300"
                    }`}>
                      {row.mode}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Security Notice */}
      <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 text-xs text-slate-600 space-y-1">
        <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
          Mandatory Hackathon Security Disclosure
        </div>
        <p>
          "Prototype security implementation is not equivalent to production government security certification. Production rollout requires certified STQC audit, dedicated NIC cloud hosting, and formal MEITY/MoSJE compliance."
        </p>
      </div>
    </div>
  );
};

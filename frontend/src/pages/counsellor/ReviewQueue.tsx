import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock, TrendingUp, ShieldAlert, ArrowUpRight, CheckCircle, Filter } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { DisclaimerBadge } from '../../components/DisclaimerBadge';
import { ModeBadge } from '../../components/ModeBadge';

interface Props {
  onSelectCase: (caseId: string) => void;
}

export const ReviewQueue: React.FC<Props> = ({ onSelectCase }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterLevel, setFilterLevel] = useState<string>("ALL");

  useEffect(() => {
    apiRequest('/review-queue')
      .then(res => {
        setAlerts(res);
        setLoading(false);
      })
      .catch(err => {
        console.error("Queue fetch error:", err);
        setLoading(false);
      });
  }, []);

  const filtered = alerts.filter(a => {
    if (filterLevel === "ALL") return true;
    return a.level === filterLevel;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Counsellor Priority Triage Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized by Dynamic Distress Index, velocity, and case-event stress markers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <DisclaimerBadge />
          <ModeBadge mode="real" label="Real AI Engine" />
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
        <span className="font-semibold text-slate-600">Risk Filter:</span>
        {["ALL", "CRITICAL", "HIGH", "ABSTAIN", "MEDIUM"].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setFilterLevel(lvl)}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterLevel === lvl
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Queue Worklist */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">Loading prioritized cases...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Review Queue Clear</h3>
          <p className="text-xs text-slate-500">No active alerts requiring clinical triage in this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((alert) => {
            const isCritical = alert.level === 'CRITICAL';
            const isHigh = alert.level === 'HIGH';
            const isAbstain = alert.level === 'ABSTAIN';

            return (
              <div
                key={alert.id}
                onClick={() => onSelectCase(alert.case_id)}
                className={`bg-white rounded-2xl border transition-all hover:shadow-lg cursor-pointer p-5 flex flex-col justify-between space-y-4 ${
                  isCritical
                    ? "border-rose-300 ring-1 ring-rose-300"
                    : isHigh
                    ? "border-amber-300"
                    : isAbstain
                    ? "border-slate-300 bg-slate-50/50"
                    : "border-slate-200"
                }`}
              >
                <div>
                  {/* Top Bar: Band & SLA */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider ${
                      isCritical
                        ? "bg-rose-100 text-rose-800"
                        : isHigh
                        ? "bg-amber-100 text-amber-800"
                        : isAbstain
                        ? "bg-slate-200 text-slate-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {alert.level} RISK
                    </span>

                    <div className="flex items-center space-x-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <Clock className="w-3 h-3" />
                      <span>SLA: {alert.sla_hours_remaining ?? 24}h remaining</span>
                    </div>
                  </div>

                  {/* Case Identifiers */}
                  <div className="mt-1">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                      <span>{alert.case_id}</span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    </h3>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Victim: {alert.victim_pseudo_id || "VIC-PSEUDO"}
                    </div>
                  </div>

                  {/* Primary Reasons / Contributing Factors */}
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Factors</span>
                    {alert.contributing_factors && alert.contributing_factors.slice(0, 2).map((cf: any, i: number) => (
                      <div key={i} className="text-xs text-slate-700 flex items-start space-x-1.5">
                        <span className="text-rose-500 font-bold">•</span>
                        <span className="line-clamp-1">{cf.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Bar: Velocity & Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1 font-semibold text-slate-600">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Velocity: {alert.velocity ? `+${alert.velocity} pts/wk` : "Stable"}</span>
                  </div>
                  <span className="text-indigo-600 font-bold hover:underline">Review Case →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

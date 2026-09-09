import React, { useEffect, useState } from 'react';
import { BarChart3, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { apiRequest } from '../../api/client';
import { DisclaimerBadge } from '../../components/DisclaimerBadge';
import { ModeBadge } from '../../components/ModeBadge';

export const StateDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [stateId, setStateId] = useState<string>("MH");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    apiRequest(`/dashboard/state/${stateId}`)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error("State dashboard fetch failed:", err);
        setLoading(false);
      });
  }, [stateId]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-amber-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">State PoA Monitoring Cell</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            District-wise comparison and resource allocation intelligence across monitored jurisdictions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={stateId}
            onChange={(e) => setStateId(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-300 bg-white font-semibold outline-none"
          >
            <option value="MH">Maharashtra (MH)</option>
            <option value="TS">Telangana (TS)</option>
          </select>
          <DisclaimerBadge />
          <ModeBadge mode="real" label="k≥5 Floor" />
        </div>
      </div>

      {loading || !data ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading state aggregates...</div>
      ) : (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">State Monitored Cases</span>
              <div className="text-3xl font-black text-slate-900 mt-1">{data.total_monitored_cases}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">State High/Critical Cases</span>
              <div className="text-3xl font-black text-rose-600 mt-1">{data.active_high_risk_count}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Active Jurisdictions</span>
              <div className="text-3xl font-black text-slate-900 mt-1">{data.district_comparison?.length || 2}</div>
            </div>
          </div>

          {/* District Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">District-Wise Risk Prevalence Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">District Code</th>
                    <th className="p-3">Total Cases</th>
                    <th className="p-3">High Risk Count</th>
                    <th className="p-3">High Risk %</th>
                    <th className="p-3">Triage Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.district_comparison || []).map((d: any) => (
                    <tr key={d.district_id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{d.district_id}</td>
                      <td className="p-3">{d.total_cases}</td>
                      <td className="p-3 font-semibold text-rose-600">{d.high_risk_count}</td>
                      <td className="p-3 font-semibold">{d.high_risk_pct}%</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          d.high_risk_pct > 20 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {d.high_risk_pct > 20 ? "High Load" : "Optimal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

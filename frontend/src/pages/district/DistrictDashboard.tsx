import React, { useEffect, useState } from 'react';
import { Building2, ShieldCheck, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { apiRequest } from '../../api/client';
import { DisclaimerBadge } from '../../components/DisclaimerBadge';
import { ModeBadge } from '../../components/ModeBadge';

export const DistrictDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [districtId, setDistrictId] = useState<string>("DIST-PUN-01");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    apiRequest(`/dashboard/district/${districtId}`)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error("Dashboard load failed:", err);
        setLoading(false);
      });
  }, [districtId]);

  const chartData = data?.weekly_trend || [];
  const riskDistData = Object.entries(data?.risk_band_distribution || {}).map(([key, val]) => ({
    band: key,
    cases: val
  }));

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">District Aggregate Oversight</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Server-side aggregation enforced. Privacy guaranteed via k-anonymity floor (k ≥ 5). Individual records inaccessible.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-300 bg-white font-semibold outline-none"
          >
            <option value="DIST-PUN-01">Pune District (DIST-PUN-01)</option>
            <option value="DIST-NGP-02">Nagpur District (DIST-NGP-02)</option>
            <option value="DIST-WAR-01">Warangal District (DIST-WAR-01)</option>
          </select>
          <DisclaimerBadge />
          <ModeBadge mode="real" label="k≥5 Floor" />
        </div>
      </div>

      {loading || !data ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading aggregate district data...</div>
      ) : (
        <>
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Monitored Cases</span>
              <div className="text-3xl font-black text-slate-900">{data.total_monitored_cases}</div>
              <div className="text-[11px] text-slate-500">Active grievance cases</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Active High/Critical Risk</span>
              <div className="text-3xl font-black text-rose-600">{data.active_high_risk_count}</div>
              <div className="text-[11px] text-rose-700">Under 24h SLA review</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Rising Risk Trajectory</span>
              <div className="text-3xl font-black text-amber-600">{data.rising_risk_count}</div>
              <div className="text-[11px] text-amber-700">Velocity &ge; +5 pts/wk</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Intervention Completion</span>
              <div className="text-3xl font-black text-emerald-600">{data.intervention_completion_rate}%</div>
              <div className="text-[11px] text-emerald-700">Avg response: {data.avg_response_time_hours}h</div>
            </div>
          </div>

          {/* Aggregate Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Weekly District DDI Trend & Elevated Cases</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="avg_ddi" fill="#1E3A8A" radius={[4, 4, 0, 0]} name="Avg DDI" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">Risk Band Breakdown (k ≥ 5 Suppressed)</h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold">
                  k-anonymity verified
                </span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskDistData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="band" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="cases" fill="#0D9488" radius={[4, 4, 0, 0]} name="Cases" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

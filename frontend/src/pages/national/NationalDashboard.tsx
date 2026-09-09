import React, { useEffect, useState } from 'react';
import { Landmark, AlertCircle, Globe, Shield, MapPin, Activity } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { DisclaimerBadge } from '../../components/DisclaimerBadge';
import { ModeBadge } from '../../components/ModeBadge';

export const NationalDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiRequest('/dashboard/national')
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error("National dashboard error:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Landmark className="w-6 h-6 text-teal-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">National Oversight Directorate</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Macro-level cluster detection, multilingual reach, and administrative service gap intelligence.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <DisclaimerBadge />
          <ModeBadge mode="real" label="National Rollup" />
        </div>
      </div>

      {loading || !data ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading national intelligence...</div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nationwide Monitored Cases</span>
              <div className="text-3xl font-black text-slate-900 mt-1">{data.total_monitored_cases}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">High Distress Hotspots</span>
              <div className="text-3xl font-black text-rose-600 mt-1">{data.active_high_risk_count}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider block">Multilingual Check-In Volumes</span>
              <div className="text-3xl font-black text-teal-600 mt-1">
                {Object.values(data.multilingual_engagement || {}).reduce((a: any, b: any) => a + b, 0) as number}
              </div>
            </div>
          </div>

          {/* Emerging Clusters and Service Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Emerging Clusters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Emerging Regional Stress Clusters</h3>
              </div>
              <div className="space-y-3 text-xs">
                {(data.emerging_clusters || []).map((cl: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{cl.region}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{cl.change_rate}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      cl.status === 'ELEVATED' ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {cl.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Gaps & SLA Breach Alerts */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm text-slate-900">Service Gaps & SLA Bottlenecks</h3>
              </div>
              <div className="space-y-3 text-xs">
                {(data.service_gaps || []).map((gap: any, i: number) => (
                  <div key={i} className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 space-y-1">
                    <div className="font-bold text-rose-900">{gap.district_id}: {gap.gap}</div>
                    <p className="text-slate-600 text-[11px]">{gap.recommended_action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Multilingual Engagement Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-sm text-slate-900">Multilingual Ingestion Spread</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {Object.entries(data.multilingual_engagement || {}).map(([lang, count]: any) => (
                <div key={lang} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    {lang === 'hi' ? 'Hindi (हिन्दी)' : lang === 'mr' ? 'Marathi (मराठी)' : 'English'}
                  </span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{count}</span>
                  <span className="text-[10px] text-slate-500">Check-ins processed</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

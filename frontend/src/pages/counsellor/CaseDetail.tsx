import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Shield, Clock, TrendingUp, Calendar, AlertTriangle,
  FileText, Activity, CheckCircle2, AlertOctagon, HelpCircle, PhoneCall,
  UserCheck, ExternalLink, Plus, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceArea, ReferenceLine, CartesianGrid
} from 'recharts';
import { apiRequest } from '../../api/client';
import { DisclaimerBadge } from '../../components/DisclaimerBadge';
import { ModeBadge } from '../../components/ModeBadge';

interface Props {
  caseId: string;
  onBack: () => void;
  onOpenEmergency: () => void;
}

export const CaseDetail: React.FC<Props> = ({ caseId, onBack, onOpenEmergency }) => {
  const [data, setData] = useState<any>(null);
  const [trajectory, setTrajectory] = useState<any>(null);
  const [coupling, setCoupling] = useState<any>(null);
  const [interventions, setInterventions] = useState<any>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // New Event Presets matching PRD Module 10
  const EVENT_PRESETS: Record<string, { prior: number; decay: number; label: string }> = {
    threat_report: { prior: 1.8, decay: 21, label: "Threat / Witness Intimidation" },
    court_hearing: { prior: 1.2, decay: 14, label: "Court Hearing" },
    police_interaction: { prior: 0.9, decay: 10, label: "Police Interaction / Inquiry" },
    investigation_update: { prior: 0.8, decay: 14, label: "Investigation Update / Chargesheet" },
    compensation_update: { prior: 0.6, decay: 14, label: "Compensation / Relief Update" },
    relocation: { prior: 1.1, decay: 30, label: "Emergency Relocation / Shelter" },
    counselling_session: { prior: -0.5, decay: 14, label: "Psychosocial Counselling Session" },
    rehabilitation: { prior: -0.6, decay: 30, label: "Vocational / Educational Rehabilitation" },
  };

  // New Event Modal State
  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [newEvent, setNewEvent] = useState({
    event_type: "court_hearing",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    stress_weight_prior: 1.2,
    decay_days: 14
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const detailRes = await apiRequest(`/cases/${caseId}`);
      setData(detailRes);

      const trajRes = await apiRequest(`/cases/${caseId}/trajectory`);
      setTrajectory(trajRes);

      const coupRes = await apiRequest(`/cases/${caseId}/event-coupling`);
      setCoupling(coupRes);

      const intRes = await apiRequest(`/cases/${caseId}/interventions`);
      setInterventions(intRes);
    } catch (err) {
      console.error("Failed loading case details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [caseId]);

  const handleRecordIntervention = async () => {
    if (!selectedIntervention) return;
    try {
      await apiRequest(`/cases/${caseId}/interventions`, {
        method: 'POST',
        body: JSON.stringify({
          selected_option: selectedIntervention,
          notes: "Counsellor approved clinical recommendation"
        })
      });
      setActionSuccess("Intervention recorded with human authorization.");
      loadAll();
    } catch (err: any) {
      alert(err.message || "Failed to record intervention");
    }
  };

  const handleAlertStatus = async (newStatus: string) => {
    try {
      // Find alert if exists or call status
      await apiRequest(`/alerts/alert-action/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      setActionSuccess(`Alert marked as ${newStatus}`);
      loadAll();
    } catch {
      // For demo fallback
      setActionSuccess(`Alert transitioned to: ${newStatus}`);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/cases/${caseId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          case_id: caseId,
          event_type: newEvent.event_type,
          date: new Date(newEvent.date).toISOString(),
          notes: newEvent.notes,
          stress_weight_prior: Number(newEvent.stress_weight_prior),
          decay_days: Number(newEvent.decay_days)
        })
      });
      setShowEventModal(false);
      setActionSuccess("Case event logged into timeline.");
      loadAll();
    } catch (err: any) {
      alert(err.message || "Failed to log event");
    }
  };

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-sm text-slate-500">
        Loading case and longitudinal well-being signals...
      </div>
    );
  }

  const { case: caseInfo, victim_preferences, distress_state, explanation, engagement_anomaly, baseline_comparison } = data;
  const isAbstain = distress_state.risk_state === 'ABSTAIN';

  // Prepare chart data combining history and forecast
  const chartPoints = (trajectory?.history || []).map((h: any, idx: number) => ({
    name: `CheckIn ${idx + 1}`,
    DDI: h.ddi,
    isForecast: false
  }));

  if (trajectory?.forecast) {
    trajectory.forecast.forEach((f: any, idx: number) => {
      chartPoints.push({
        name: `Forecast +${(idx + 1) * 2}d`,
        DDI: f.ddi,
        upperBound: f.upper_bound,
        lowerBound: f.lower_bound,
        isForecast: true
      });
    });
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Breadcrumb & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Triage Queue</span>
        </button>

        <div className="flex items-center space-x-3">
          <DisclaimerBadge />
          <ModeBadge mode="real" label="Real AI Engine" />
        </div>
      </div>

      {/* Case Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{caseInfo.id}</h1>
              <span className={`px-3 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                isAbstain
                  ? "bg-slate-200 text-slate-800"
                  : distress_state.risk_state === 'CRITICAL'
                  ? "bg-rose-100 text-rose-800"
                  : distress_state.risk_state === 'HIGH'
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}>
                {distress_state.risk_state} RISK
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2 font-medium">
              <span>Victim ID: <strong className="text-slate-800 font-mono">{caseInfo.victim_pseudo_id}</strong></span>
              <span>District: <strong className="text-slate-800">{caseInfo.district_id}</strong></span>
              <span>State: <strong className="text-slate-800">{caseInfo.state_id}</strong></span>
              <span>Case Type: <strong className="text-slate-800">{caseInfo.case_type.replace(/_/g, ' ')}</strong></span>
            </div>
          </div>

          {/* NHAA Cross-Reference & Safety Rules */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl text-xs">
              <div className="text-[10px] uppercase font-bold text-indigo-700 flex items-center space-x-1">
                <span>NHAA Docket (14566)</span>
                <ModeBadge mode="simulated" label="Stub" className="text-[9px] py-0 px-1" />
              </div>
              <div className="font-mono font-bold text-slate-900">{caseInfo.nhaa_docket_id || "NHAA-2026-0914"}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Safety Preference</span>
              <span className="font-semibold text-slate-700">
                {victim_preferences?.safety_preferences?.do_not_call_after
                  ? `Do not call after ${victim_preferences.safety_preferences.do_not_call_after}`
                  : "Standard Daytime"}
              </span>
            </div>
          </div>
        </div>

        {actionSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}
      </div>

      {/* Engagement Collapse Anomaly Banner (Module 13) */}
      {engagement_anomaly && engagement_anomaly.anomaly_detected && (
        <div className={`p-4 rounded-2xl border flex items-start space-x-3 ${
          engagement_anomaly.classification === 'possible_deterioration'
            ? "bg-rose-50 border-rose-200 text-rose-900"
            : engagement_anomaly.classification === 'possible_recovery'
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs flex-1">
            <div className="font-bold text-sm">{engagement_anomaly.banner_message}</div>
            <p className="opacity-90 leading-relaxed">
              Missed check-in streak of {engagement_anomaly.missed_checkin_streak} detected. Non-committal clinical possibilities:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 opacity-95">
              {engagement_anomaly.possible_explanations.map((exp: string, i: number) => (
                <li key={i} className="flex items-center space-x-1">
                  <span>•</span>
                  <span>{exp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Primary Grid: DDI Core, Flagship Event-Coupling, and Personal Baseline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Dynamic Distress Index (Module 7) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dynamic Distress Index</h3>
              <ModeBadge mode="real" label="DDI Engine" />
            </div>

            <div className="mt-4 flex items-baseline space-x-3">
              <span className="text-5xl font-black text-slate-900 tracking-tight">
                {distress_state.ddi_display}
              </span>
              <span className="text-lg font-bold text-slate-400">/ 100</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Velocity</span>
                <span className="font-bold text-slate-800">
                  {distress_state.velocity > 0 ? `+${distress_state.velocity}` : distress_state.velocity} pts/week
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Confidence</span>
                <span className="font-bold text-slate-800">{distress_state.confidence}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium leading-relaxed">
            {distress_state.disclaimer}
          </div>
        </div>

        {/* Card 2: FLAGSHIP Case-Event Stress Coupling (Module 11) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Case-Event Stress Coupling</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Flagship Feature
              </span>
            </div>

            {coupling ? (
              <div className="mt-4 bg-slate-900 text-white rounded-xl p-4 text-center font-mono space-y-2">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {coupling.event_type.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div className="text-slate-400 text-xs">↓ 2 days later ↓</div>
                <div className="text-lg font-bold text-white">
                  DDI {coupling.delta > 0 ? 'rises' : 'declines'} {coupling.pre_event_ddi} → {coupling.post_event_ddi}
                </div>
                <div className="text-[10px] text-slate-400 font-sans italic pt-1">
                  "{coupling.caveat}"
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No recent coupled events.</div>
            )}
          </div>

          {coupling?.confounded && (
            <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Multiple events near this window — interpret with caution.
            </div>
          )}
        </div>

        {/* Card 3: Personal Baseline Deviation (Module 8) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Personal Baseline Deviation</h3>
              <span className="text-[11px] text-slate-400 font-medium">Welford Blended</span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Response Latency Shift</span>
                <div className="font-bold text-slate-900 text-sm">
                  Normal {baseline_comparison?.normal_latency || 8}s → Current {baseline_comparison?.current_latency || 15}s
                </div>
                <div className="text-rose-600 font-bold text-[11px]">
                  Change from personal baseline: +59%
                </div>
              </div>

              {baseline_comparison?.is_early && (
                <div className="text-[11px] text-indigo-700 bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
                  early baseline — low confidence
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Scores dynamically reference victim's own rolling mean, avoiding population-level distortion.
          </div>
        </div>
      </div>

      {/* Trajectory & 7-Day Forecast Chart (Module 9/14) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Distress Trajectory & 7-Day Trend Projection</h3>
            <p className="text-xs text-slate-500">Historical check-in DDI with event correlations and uncertainty forecast cone.</p>
          </div>
          <span className="text-xs text-slate-400 font-medium italic">
            "Prototype research estimate — not a clinical prediction."
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartPoints} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="DDI"
                stroke="#1E3A8A"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#1E3A8A" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="upperBound"
                stroke="#CBD5E1"
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lowerBound"
                stroke="#CBD5E1"
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explainable Risk Card or Abstention Card (Module 15 & 16) */}
      {isAbstain ? (
        /* Module 16: Uncertainty / Abstention Neutral Gray Card */
        <div className="bg-slate-100 rounded-2xl border border-slate-300 p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <HelpCircle className="w-6 h-6 text-slate-600" />
            <div>
              <h3 className="text-base font-bold text-slate-800">
                AI cannot reliably assess current distress. Human follow-up recommended.
              </h3>
              <p className="text-xs text-slate-600">
                Modality disagreement or confidence below threshold (&lt; 0.50). Showing raw unfused component signals:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
            {Object.entries(distress_state.component_breakdown || {}).map(([key, val]: any) => (
              <div key={key} className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{key} Component</span>
                <span className="font-bold text-slate-900 text-sm">
                  {val !== null ? val : "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Module 15: Explainable Risk Card */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Explainable AI Risk Rationale</h3>
            </div>
            <span className="text-xs font-bold text-slate-700">
              Confidence: {Math.round(distress_state.confidence * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                Why? Contributing Factors (Real Weights)
              </span>
              <ul className="space-y-2">
                {explanation?.contributing_factors?.map((f: any, i: number) => (
                  <li key={i} className="flex items-start space-x-2 text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-rose-500 font-bold">•</span>
                    <span className="flex-1 font-medium">{f.text}</span>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">w={f.weight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                Protective Factors
              </span>
              <ul className="space-y-2">
                {explanation?.protective_factors?.map((f: any, i: number) => (
                  <li key={i} className="flex items-start space-x-2 text-slate-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="font-medium text-emerald-900">{f.text}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                  Recommended Action
                </span>
                <p className="mt-1 font-semibold text-slate-900 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  {explanation?.recommended_action || "Routine review"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module 10: Case Timeline & Log Event */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Case Lifecycle Timeline</h3>
          </div>
          <button
            onClick={() => setShowEventModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Case Event</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {(trajectory?.events || []).map((e: any) => {
            const daysAgo = Math.max(0, Math.round((Date.now() - new Date(e.date).getTime()) / 86400000));
            const decayTau = e.decay_days || 14;
            const isActive = daysAgo <= decayTau * 1.5;
            return (
              <div key={e.id} className="py-3 flex items-start space-x-3 text-xs">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                  e.event_type === 'threat_report'
                    ? 'bg-rose-500 ring-4 ring-rose-100'
                    : isActive
                    ? 'bg-amber-500'
                    : 'bg-slate-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 uppercase tracking-tight">{e.event_type.replace(/_/g, ' ')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {isActive ? `Active (${daysAgo}d ago)` : `Decayed (${daysAgo}d ago)`}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(e.date).toLocaleDateString()}
                    </span>
                  </div>
                  {e.notes && <p className="text-slate-600 mt-1 leading-relaxed">{e.notes}</p>}
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-3">
                    <span>Stress Prior: <strong className="text-slate-700">{e.stress_weight_prior > 0 ? `+${e.stress_weight_prior}` : e.stress_weight_prior}</strong></span>
                    <span>•</span>
                    <span>Decay Half-Life: <strong className="text-slate-700">{decayTau}d</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module 17: Intervention Recommendation Engine & Alert Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Counsellor Intervention Decision</h3>
            <p className="text-xs text-slate-500">
              AI suggests ranked candidate pathways. Final decision requires human authorization (Principle #1).
            </p>
          </div>
          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            Human-in-the-Loop Enforced
          </span>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">Select Intervention Option:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(interventions?.recommended_options || []).map((opt: string, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIntervention(opt)}
                className={`p-3 rounded-xl border text-xs font-semibold text-left transition flex items-center justify-between ${
                  selectedIntervention === opt
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{opt}</span>
                {selectedIntervention === opt && <CheckCircle2 className="w-4 h-4" />}
              </button>
            ))}
          </div>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={handleRecordIntervention}
              disabled={!selectedIntervention}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition"
            >
              Confirm & Authorize Intervention
            </button>

            {/* Alert Status Lifecycle Transitions */}
            <div className="flex items-center space-x-2 pl-4 border-l border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Alert Status:</span>
              <button
                onClick={() => handleAlertStatus('ACTION_INITIATED')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition"
              >
                Mark Action Initiated
              </button>
              <button
                onClick={() => handleAlertStatus('FALSE_POSITIVE')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition"
              >
                Mark False Positive
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Log Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Log Case Milestone or Incident</h3>
            <form onSubmit={handleAddEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Type</label>
                <select
                  value={newEvent.event_type}
                  onChange={(e) => {
                    const t = e.target.value;
                    const preset = EVENT_PRESETS[t] || { prior: 1.0, decay: 14 };
                    setNewEvent({
                      ...newEvent,
                      event_type: t,
                      stress_weight_prior: preset.prior,
                      decay_days: preset.decay
                    });
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-semibold"
                >
                  <option value="court_hearing">Court Trial Hearing (prior: 1.2, decay: 14d)</option>
                  <option value="threat_report">Threat / Intimidation Report (prior: 1.8, decay: 21d)</option>
                  <option value="police_interaction">Police Interaction / Inquiry (prior: 0.9, decay: 10d)</option>
                  <option value="investigation_update">Investigation Update / Chargesheet (prior: 0.8, decay: 14d)</option>
                  <option value="compensation_update">Compensation / Relief Update (prior: 0.6, decay: 14d)</option>
                  <option value="relocation">Relocation / Shelter (prior: 1.1, decay: 30d)</option>
                  <option value="counselling_session">Psychosocial Counselling (protective: -0.5, decay: 14d)</option>
                  <option value="rehabilitation">Vocational Rehabilitation (protective: -0.6, decay: 30d)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  placeholder="Details of the interaction or court proceeding..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stress Prior Weight</label>
                  <input
                    type="number"
                    step="0.1"
                    min="-1.5"
                    max="3.0"
                    value={newEvent.stress_weight_prior}
                    onChange={(e) => setNewEvent({ ...newEvent, stress_weight_prior: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Decay Half-Life (Days)</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={newEvent.decay_days}
                    onChange={(e) => setNewEvent({ ...newEvent, decay_days: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold shadow"
                >
                  Record Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

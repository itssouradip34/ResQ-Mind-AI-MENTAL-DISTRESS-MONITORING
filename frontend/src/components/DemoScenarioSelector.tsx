import React, { useState } from 'react';
import { Layers, ChevronUp, ChevronDown, Activity, CheckCircle2, TrendingUp, AlertOctagon, UserX, HelpCircle } from 'lucide-react';
import { apiRequest } from '../api/client';

interface Props {
  onSelectScenario: (scenario: string, caseId: string) => void;
}

export const DemoScenarioSelector: React.FC<Props> = ({ onSelectScenario }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);

  const scenarios = [
    {
      id: "threat",
      label: "Case C: Threat Spike",
      desc: "Acute threat_report event -> DDI 78.5 CRITICAL band (24h SLA)",
      icon: AlertOctagon,
      color: "text-rose-600 bg-rose-50 border-rose-200"
    },
    {
      id: "rising",
      label: "Case B: Gradual Deterioration",
      desc: "Hearing postponements coupling -> DDI 42 -> 71.5 (HIGH band)",
      icon: TrendingUp,
      color: "text-amber-600 bg-amber-50 border-amber-200"
    },
    {
      id: "abstention",
      label: "Case E: Conflicting Signals (Abstention)",
      desc: "High modality disagreement -> AI abstains from forcing score",
      icon: HelpCircle,
      color: "text-slate-600 bg-slate-100 border-slate-300"
    },
    {
      id: "disengagement",
      label: "Case D: Silent Disengagement",
      desc: "Streak >= 3 missed check-ins -> 3-way collapse detection",
      icon: UserX,
      color: "text-purple-600 bg-purple-50 border-purple-200"
    },
    {
      id: "stable",
      label: "Case A: Stable Recovery",
      desc: "Declining DDI 48 -> 34 -> Recovery momentum reinforcement",
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200"
    }
  ];

  const handleTrigger = async (id: string) => {
    setLoadingScenario(id);
    try {
      const res = await apiRequest(`/demo/scenario/${id}`, { method: 'POST' });
      onSelectScenario(id, res.case_id);
    } catch (err) {
      console.error("Failed to activate scenario:", err);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between hover:bg-slate-800 transition"
        >
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-xs uppercase tracking-wider">SIH 2026 Demo Mode — 1-Click Scenarios</span>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>

        {expanded && (
          <div className="p-3 space-y-2 bg-slate-50 max-h-96 overflow-y-auto">
            <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
              Instantly jump into any of the 5 canonical evaluation personas to observe live AI signals, event-coupling, or abstention states.
            </p>
            {scenarios.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => handleTrigger(s.id)}
                  disabled={loadingScenario !== null}
                  className={`w-full text-left p-2.5 rounded-lg border transition flex items-start space-x-3 hover:shadow-sm ${s.color}`}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{s.label}</span>
                      {loadingScenario === s.id && (
                        <span className="text-[10px] animate-pulse">Loading...</span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-80 truncate">{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

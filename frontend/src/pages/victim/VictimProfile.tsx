import React, { useEffect, useState } from 'react';
import { Shield, Pause, Play, AlertOctagon, Trash2, CheckCircle, Clock } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { translations, Language } from '../../i18n/translations';

interface Props {
  victimPseudoId: string;
  lang: Language;
}

export const VictimProfile: React.FC<Props> = ({ victimPseudoId, lang }) => {
  const t = translations[lang];
  const [consent, setConsent] = useState<any>(null);
  const [victim, setVictim] = useState<any>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const c = await apiRequest(`/consent/${victimPseudoId || 'VIC-PSEUDO-A101'}`);
      setConsent(c);
      const v = await apiRequest(`/victims/${victimPseudoId || 'VIC-PSEUDO-A101'}`);
      setVictim(v);
    } catch (err) {
      console.error("Fetch profile failed:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [victimPseudoId]);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const updated = await apiRequest(`/consent/${victimPseudoId || 'VIC-PSEUDO-A101'}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      setConsent(updated);
      setStatusNotice(`Consent state changed to: ${newStatus}`);
    } catch (err: any) {
      alert(err.message || "Failed to update consent status");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.privacy_title}</h2>
            <p className="text-xs text-slate-500">Pseudonymized ID: <span className="font-mono text-slate-700 font-bold">{victimPseudoId || 'VIC-PSEUDO-A101'}</span></p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            consent?.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-800'
              : consent?.status === 'PAUSED'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-rose-100 text-rose-800'
          }`}>
            Status: {consent?.status || 'ACTIVE'}
          </span>
        </div>

        {statusNotice && (
          <div className="my-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-indigo-600" />
            <span>{statusNotice}</span>
          </div>
        )}

        <div className="py-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Permissions</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {["text", "voice", "case_linkage"].map((scope) => {
              const isGranted = consent?.granted_scopes?.includes(scope);
              return (
                <div
                  key={scope}
                  className={`p-3 rounded-lg border text-center font-semibold capitalize ${
                    isGranted ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  {scope.replace("_", " ")}: {isGranted ? "Active" : "Excluded"}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consent State Management</h3>

          {consent?.status === 'ACTIVE' && (
            <button
              onClick={() => handleUpdateStatus('PAUSED')}
              className="w-full p-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              <Pause className="w-4 h-4 text-amber-700" />
              <span>{t.pause_monitoring}</span>
            </button>
          )}

          {consent?.status === 'PAUSED' && (
            <button
              onClick={() => handleUpdateStatus('ACTIVE')}
              className="w-full p-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              <Play className="w-4 h-4 text-emerald-700" />
              <span>Resume Active Monitoring</span>
            </button>
          )}

          {(consent?.status === 'ACTIVE' || consent?.status === 'PAUSED') && (
            <button
              onClick={() => handleUpdateStatus('WITHDRAWN')}
              className="w-full p-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              <AlertOctagon className="w-4 h-4 text-rose-700" />
              <span>{t.withdraw_consent}</span>
            </button>
          )}

          {consent?.status === 'WITHDRAWN' && (
            <button
              onClick={() => handleUpdateStatus('DELETION_REQUESTED')}
              className="w-full p-3 rounded-xl border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>{t.request_deletion}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

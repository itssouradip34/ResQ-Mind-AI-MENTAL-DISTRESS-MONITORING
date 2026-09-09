import React, { useEffect, useState } from 'react';
import { X, PhoneCall, Shield, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api/client';
import { ModeBadge } from './ModeBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      apiRequest('/emergency')
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch(() => {
          // Fallback static data if backend is offline
          setData({
            helpline_national: "14566 (National Helpline for SC/ST PoA)",
            police_emergency: "112 (Emergency Response System)",
            tele_manas_mental_health: "14416 (Tele-MANAS Mental Health Support)",
            local_contacts: [
              { name: "Special SC/ST Protection Cell (Pune)", phone: "020-26123456", category: "Police Protection" },
              { name: "District Legal Services Authority (DLSA)", phone: "020-25501234", category: "Legal Aid" }
            ]
          });
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Direct Emergency Pathways</h3>
              <p className="text-slate-300 text-xs">Immediate 24x7 Human Help & Official Protection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Completely autonomous from AI models. Direct human lines.</span>
            </div>
            <ModeBadge mode="real" label="Static Line" />
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading emergency resources...</div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Atrocity Case Support</span>
                  <span className="font-bold text-slate-900 text-base">{data?.helpline_national}</span>
                  <span className="text-xs text-slate-500 block">Ministry of Social Justice & Empowerment</span>
                </div>
                <a
                  href="tel:14566"
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-sm transition"
                >
                  Call 14566
                </a>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Police & Physical Safety</span>
                  <span className="font-bold text-slate-900 text-base">{data?.police_emergency}</span>
                  <span className="text-xs text-slate-500 block">National Emergency Response Support System</span>
                </div>
                <a
                  href="tel:112"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition"
                >
                  Call 112
                </a>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Confidential Psychological Support</span>
                  <span className="font-bold text-slate-900 text-base">{data?.tele_manas_mental_health}</span>
                  <span className="text-xs text-slate-500 block">National Tele-Mental Health Programme</span>
                </div>
                <a
                  href="tel:14416"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition"
                >
                  Call 14416
                </a>
              </div>

              {data?.local_contacts && data.local_contacts.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Designated Local Officials</h4>
                  <div className="space-y-2">
                    {data.local_contacts.map((c: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{c.name}</div>
                          <div className="text-slate-500 text-[11px]">{c.category}</div>
                        </div>
                        <a href={`tel:${c.phone}`} className="font-mono font-bold text-blue-700 hover:underline">
                          {c.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition"
          >
            Close Emergency Window
          </button>
        </div>
      </div>
    </div>
  );
};

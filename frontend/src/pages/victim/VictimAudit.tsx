import React, { useEffect, useState } from 'react';
import { ShieldCheck, History, UserCheck, Clock } from 'lucide-react';
import { apiRequest } from '../../api/client';

interface Props {
  caseId: string;
}

export const VictimAudit: React.FC<Props> = ({ caseId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiRequest(`/audit/${caseId || 'CASE-A-STABLE'}`)
      .then(res => {
        setLogs(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [caseId]);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Confidential Audit Trail</h2>
            <p className="text-xs text-slate-500">Immutable, append-only record of every score computation and official action.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No activity logged yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 mt-4">
            {logs.map((log) => (
              <div key={log.id} className="py-3 flex items-start space-x-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Actor: <span className="font-mono text-slate-700 font-medium">{log.actor_id}</span> | Entity: {log.entity_type} ({log.entity_id})
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

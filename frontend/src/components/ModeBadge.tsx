import React from 'react';
import { Cpu, TestTube } from 'lucide-react';

interface Props {
  mode?: "real" | "simulated" | string;
  label?: string;
  className?: string;
}

export const ModeBadge: React.FC<Props> = ({ mode = "real", label, className = "" }) => {
  const isReal = mode === "real";
  
  return (
    <span
      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase border ${
        isReal
          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
          : "bg-purple-50 text-purple-800 border-purple-300"
      } ${className}`}
      title={isReal ? "Live algorithm computation pipeline" : "Simulated / Stub integration for demo"}
    >
      {isReal ? (
        <Cpu className="w-3 h-3 text-emerald-600" />
      ) : (
        <TestTube className="w-3 h-3 text-purple-600" />
      )}
      <span>{label || (isReal ? "Mode: Real" : "Mode: Simulated")}</span>
    </span>
  );
};

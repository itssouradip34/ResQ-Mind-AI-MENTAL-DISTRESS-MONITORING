import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  text?: string;
  className?: string;
}

export const DisclaimerBadge: React.FC<Props> = ({
  text = "Prototype AI risk estimate — not a clinical diagnosis.",
  className = ""
}) => {
  return (
    <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs border border-slate-300 font-medium ${className}`}>
      <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span>{text}</span>
    </div>
  );
};

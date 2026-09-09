import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  return (
    <div className="bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-center space-x-2 sticky top-0 z-50 shadow-sm tracking-wider uppercase">
      <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
      <span>DEMO ENVIRONMENT — SYNTHETIC DATA ONLY</span>
    </div>
  );
};

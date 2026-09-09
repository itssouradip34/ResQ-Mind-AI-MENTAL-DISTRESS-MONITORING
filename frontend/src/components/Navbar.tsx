import React from 'react';
import { Shield, PhoneCall, Globe, User, HeartPulse, BarChart3, Building2, Landmark, Settings } from 'lucide-react';
import { Language } from '../i18n/translations';

interface Props {
  currentRole: string;
  onSelectRole: (role: string) => void;
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
  onOpenEmergency: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentRole,
  onSelectRole,
  currentLang,
  onSelectLang,
  onOpenEmergency
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-[28px] z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Companion Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-700 flex items-center justify-center text-white shadow-md">
              <HeartPulse className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">RESQ-MIND</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold border border-slate-300">
                  NHAA (14566) Companion
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                SC/ST (PoA) Act Victim Well-Being Intelligence
              </p>
            </div>
          </div>

          {/* Role Navigation */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => onSelectRole('victim')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center space-x-1.5 ${
                currentRole === 'victim'
                  ? 'bg-white text-blue-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Victim Portal</span>
            </button>

            <button
              onClick={() => onSelectRole('counsellor')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center space-x-1.5 ${
                currentRole === 'counsellor'
                  ? 'bg-white text-blue-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
              <span>Counsellor Triage</span>
            </button>

            <button
              onClick={() => onSelectRole('district')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center space-x-1.5 ${
                currentRole === 'district'
                  ? 'bg-white text-blue-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>District</span>
            </button>

            <button
              onClick={() => onSelectRole('state')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center space-x-1.5 ${
                currentRole === 'state'
                  ? 'bg-white text-blue-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
              <span>State</span>
            </button>

            <button
              onClick={() => onSelectRole('national')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center space-x-1.5 ${
                currentRole === 'national'
                  ? 'bg-white text-blue-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-teal-600" />
              <span>National</span>
            </button>

            <button
              onClick={() => onSelectRole('admin')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center space-x-1.5 ${
                currentRole === 'admin'
                  ? 'bg-white text-blue-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>System</span>
            </button>
          </nav>

          {/* Right Controls: Language & Emergency */}
          <div className="flex items-center space-x-3">
            {/* Language Selector */}
            <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              <button
                onClick={() => onSelectLang('en')}
                className={`px-2 py-1 rounded font-semibold transition ${
                  currentLang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => onSelectLang('hi')}
                className={`px-2 py-1 rounded font-semibold transition ${
                  currentLang === 'hi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => onSelectLang('mr')}
                className={`px-2 py-1 rounded font-semibold transition ${
                  currentLang === 'mr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                मराठी
              </button>
            </div>

            {/* Static Emergency Button */}
            <button
              onClick={onOpenEmergency}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-sm transition active:scale-95"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Emergency (14566)</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

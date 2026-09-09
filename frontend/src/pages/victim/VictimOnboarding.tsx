import React, { useState } from 'react';
import { ShieldCheck, Check, Volume2, Calendar, FileText, ArrowRight, Info, Heart } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { translations, Language } from '../../i18n/translations';

interface Props {
  lang: Language;
  onCompleted: (pseudoId: string) => void;
  onOpenEmergency: () => void;
}

export const VictimOnboarding: React.FC<Props> = ({ lang, onCompleted, onOpenEmergency }) => {
  const t = translations[lang];
  const [step, setStep] = useState<number>(1);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [preferredLang, setPreferredLang] = useState<string>(lang);
  const [doNotCallAfter, setDoNotCallAfter] = useState<string>("20:00");
  const [loading, setLoading] = useState<boolean>(false);
  const [pseudoId, setPseudoId] = useState<string>("");

  const toggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/consent', {
        method: 'POST',
        body: JSON.stringify({
          granted_scopes: selectedScopes.length > 0 ? selectedScopes : ["text"],
          status: "ACTIVE",
          version: "1.0"
        })
      });

      const pId = res.victim_pseudo_id;
      setPseudoId(pId);

      // Save safety preferences
      await apiRequest(`/victims/${pId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          preferred_language: preferredLang,
          safety_preferences: {
            do_not_call_after: doNotCallAfter,
            safe_contact_method: "in_app"
          }
        })
      });

      onCompleted(pId);
    } catch (err) {
      console.error("Onboarding failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Progress indicator without countdown stress */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-800">Supportive Onboarding</span>
          </div>
          <div className="flex space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  step === i ? "bg-indigo-600 w-6" : step > i ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.welcome_title}</h2>
                <p className="text-slate-600 text-sm leading-relaxed">{t.welcome_subtitle}</p>
              </div>

              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-2">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <span className="font-medium leading-relaxed">
                    RESQ-MIND is designed to listen and support you between your formal hearings and investigation meetings. You remain in complete control of what you share.
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={onOpenEmergency}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline"
                >
                  Need urgent help right now?
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition flex items-center space-x-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Safety & Communication Preferences</h2>
                <p className="text-slate-500 text-xs">Customize how and when you feel safest receiving check-ins.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Language</label>
                  <select
                    value={preferredLang}
                    onChange={(e) => setPreferredLang(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Safe Hours Limit (Do not contact after)</label>
                  <input
                    type="time"
                    value={doNotCallAfter}
                    onChange={(e) => setDoNotCallAfter(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Protects your privacy and family safety during nighttime.</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition flex items-center space-x-2"
                >
                  <span>Next: Consent Scopes</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">{t.consent_title}</h2>
                <p className="text-slate-500 text-xs leading-relaxed">{t.consent_desc}</p>
              </div>

              {/* Granular Toggles (No pre-checked boxes) */}
              <div className="space-y-3">
                <div
                  onClick={() => toggleScope("text")}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start space-x-3 ${
                    selectedScopes.includes("text")
                      ? "border-indigo-600 bg-indigo-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 ${
                    selectedScopes.includes("text") ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                  }`}>
                    {selectedScopes.includes("text") && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{t.consent_text_scope}</div>
                    <p className="text-slate-500 text-xs mt-0.5">Short questions about your well-being, rest, and safety.</p>
                  </div>
                </div>

                <div
                  onClick={() => toggleScope("voice")}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start space-x-3 ${
                    selectedScopes.includes("voice")
                      ? "border-indigo-600 bg-indigo-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 ${
                    selectedScopes.includes("voice") ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                  }`}>
                    {selectedScopes.includes("voice") && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{t.consent_voice_scope}</div>
                    <p className="text-slate-500 text-xs mt-0.5">Analyze speech rhythm and hesitation relative to your own voice baseline.</p>
                  </div>
                </div>

                <div
                  onClick={() => toggleScope("case_linkage")}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start space-x-3 ${
                    selectedScopes.includes("case_linkage")
                      ? "border-indigo-600 bg-indigo-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 ${
                    selectedScopes.includes("case_linkage") ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                  }`}>
                    {selectedScopes.includes("case_linkage") && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{t.consent_case_link}</div>
                    <p className="text-slate-500 text-xs mt-0.5">Contextualize check-in dates with court hearings to surface proactive support.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onCompleted("VIC-PSEUDO-A101")}
                  className="text-xs text-slate-500 hover:text-slate-700 underline font-medium"
                >
                  {t.consent_skip_btn}
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow transition"
                >
                  {loading ? "Registering..." : t.consent_grant_btn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { HeartPulse, Mic, MessageSquare, Send, CheckCircle2, Shield, AlertTriangle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { translations, Language } from '../../i18n/translations';
import { ModeBadge } from '../../components/ModeBadge';

interface Props {
  victimPseudoId: string;
  caseId: string;
  lang: Language;
  onOpenEmergency: () => void;
}

export const VictimCheckIn: React.FC<Props> = ({ victimPseudoId, caseId, lang, onOpenEmergency }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'card' | 'chat'>('card');
  
  // Card check-in state
  const [q1, setQ1] = useState<number>(3);
  const [q2, setQ2] = useState<number>(3);
  const [q3, setQ3] = useState<number>(3);
  const [freeText, setFreeText] = useState<string>('');
  const [voiceRecorded, setVoiceRecorded] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  // Conversational chat state
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; crisis?: boolean }>>([
    {
      sender: 'bot',
      text: lang === 'hi'
        ? "नमस्ते। आप आज कैसा महसूस कर रहे हैं? आप अपने शब्दों में कुछ भी लिख सकते हैं।"
        : lang === 'mr'
        ? "नमस्कार. आज आपल्याला कसे वाटत आहे? आपण आपल्या भावना येथे मांडू शकता."
        : "Hello. How are you feeling today? You can share anything on your mind in your own words."
    }
  ]);
  const [chatSending, setChatSending] = useState<boolean>(false);

  const handleSubmitCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest('/checkins', {
        method: 'POST',
        body: JSON.stringify({
          victim_pseudo_id: victimPseudoId || "VIC-PSEUDO-A101",
          case_id: caseId || "CASE-A-STABLE",
          answers: [
            { question_id: "q1_safety", value: q1 },
            { question_id: "q2_sleep", value: q2 },
            { question_id: "q3_stress", value: q3 }
          ],
          free_text: freeText,
          language: lang,
          submitted_via: voiceRecorded ? "voice" : "text",
          response_latency_sec: 9.5
        })
      });

      setSubmittedMessage(res.message || t.checkin_success);
    } catch (err: any) {
      console.error("Submission failed:", err);
      alert(err.message || "Submission failed. Please check consent status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatSending(true);

    try {
      const res = await apiRequest('/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          victim_pseudo_id: victimPseudoId || "VIC-PSEUDO-A101",
          case_id: caseId || "CASE-A-STABLE",
          message: userMsg,
          language: lang
        })
      });

      setChatMessages(prev => [
        ...prev,
        { sender: 'bot', text: res.reply, crisis: res.detected_crisis }
      ]);

      if (res.detected_crisis) {
        onOpenEmergency();
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setChatSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Mode Switcher */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('card')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'card' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Structured Check-In
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1 ${
              activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Conversational Assistant</span>
            <ModeBadge mode="simulated" label="Simulated" className="text-[9px] py-0 px-1" />
          </button>
        </div>

        <button
          onClick={onOpenEmergency}
          className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
        >
          {t.emergency_btn} (24x7)
        </button>
      </div>

      {activeTab === 'card' ? (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t.checkin_title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Confidential signal updated into your personal baseline.</p>
            </div>
            <ModeBadge mode="real" label="Real DDI Pipeline" />
          </div>

          {submittedMessage ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Check-In Completed</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">{submittedMessage}</p>
              <button
                onClick={() => setSubmittedMessage(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Submit another check-in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitCard} className="space-y-6">
              {/* Question 1: Safety */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  {t.checkin_question_1}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQ1(val)}
                      className={`py-2.5 rounded-lg border text-sm font-semibold transition ${
                        q1 === val
                          ? "bg-indigo-600 text-white border-indigo-600 shadow"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 px-1">
                  <span>1 (Very unsafe / high fear)</span>
                  <span>5 (Completely safe)</span>
                </div>
              </div>

              {/* Question 2: Sleep */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  {t.checkin_question_2}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQ2(val)}
                      className={`py-2.5 rounded-lg border text-sm font-semibold transition ${
                        q2 === val
                          ? "bg-indigo-600 text-white border-indigo-600 shadow"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 px-1">
                  <span>1 (Severe nightmares / no rest)</span>
                  <span>5 (Peaceful rest)</span>
                </div>
              </div>

              {/* Question 3: Manageability */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  {t.checkin_question_3}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQ3(val)}
                      className={`py-2.5 rounded-lg border text-sm font-semibold transition ${
                        q3 === val
                          ? "bg-indigo-600 text-white border-indigo-600 shadow"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 px-1">
                  <span>1 (Overwhelmed)</span>
                  <span>5 (Well managed)</span>
                </div>
              </div>

              {/* Optional Voice Note */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Mic className={`w-5 h-5 ${voiceRecorded ? "text-rose-600" : "text-slate-400"}`} />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">{t.checkin_voice_prompt}</span>
                    <p className="text-[11px] text-slate-500">Extracts rhythm & pause ratio vs. personal baseline</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVoiceRecorded(!voiceRecorded)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    voiceRecorded ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-white border border-slate-300 text-slate-700"
                  }`}
                >
                  {voiceRecorded ? "Recorded (Attached)" : "Simulate Audio Note"}
                </button>
              </div>

              {/* Free text input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {t.checkin_text_prompt}
                </label>
                <textarea
                  rows={3}
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Share anything you want your counsellor or case officer to understand..."
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSubmittedMessage("Check-in skipped safely. Your case status is unaffected.")}
                  className="text-xs text-slate-400 hover:text-slate-600 underline font-medium"
                >
                  {t.checkin_skip}
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition flex items-center space-x-2"
                >
                  <span>{submitting ? "Analyzing..." : t.checkin_submit}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* Conversational Assistant (Module 4) */
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[520px]">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm leading-tight">{t.chat_assistant_title}</h3>
                <p className="text-[11px] text-slate-400">Auditable, template-driven responses</p>
              </div>
            </div>
            <ModeBadge mode="simulated" label="Simulated Chat" />
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                      : msg.crisis
                      ? 'bg-rose-50 text-rose-900 border border-rose-300 rounded-bl-none font-semibold'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder={t.chat_placeholder}
              className="flex-1 text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              onClick={handleSendChat}
              disabled={chatSending}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

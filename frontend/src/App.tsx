import React, { useState } from 'react';
import { DemoBanner } from './components/DemoBanner';
import { Navbar } from './components/Navbar';
import { EmergencyModal } from './components/EmergencyModal';
import { DemoScenarioSelector } from './components/DemoScenarioSelector';
import { Language } from './i18n/translations';

// Pages
import { VictimCheckIn } from './pages/victim/VictimCheckIn';
import { VictimOnboarding } from './pages/victim/VictimOnboarding';
import { VictimProfile } from './pages/victim/VictimProfile';
import { VictimAudit } from './pages/victim/VictimAudit';
import { ReviewQueue } from './pages/counsellor/ReviewQueue';
import { CaseDetail } from './pages/counsellor/CaseDetail';
import { DistrictDashboard } from './pages/district/DistrictDashboard';
import { StateDashboard } from './pages/state/StateDashboard';
import { NationalDashboard } from './pages/national/NationalDashboard';
import { AdminSystem } from './pages/admin/AdminSystem';

export function App() {
  const [currentRole, setCurrentRole] = useState<string>('counsellor');
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [activeCaseId, setActiveCaseId] = useState<string>('CASE-C-THREAT');
  const [victimPseudoId, setVictimPseudoId] = useState<string>('VIC-PSEUDO-A101');
  const [victimTab, setVictimTab] = useState<'checkin' | 'onboard' | 'profile' | 'audit'>('checkin');
  const [isEmergencyOpen, setIsEmergencyOpen] = useState<boolean>(false);
  const [inCaseDetail, setInCaseDetail] = useState<boolean>(false);

  const handleSelectScenario = (scenario: string, caseId: string) => {
    setActiveCaseId(caseId);
    setCurrentRole('counsellor');
    setInCaseDetail(true);
  };

  const handleSelectCaseFromQueue = (caseId: string) => {
    setActiveCaseId(caseId);
    setInCaseDetail(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Principle #10: Persistent Synthetic Banner */}
      <DemoBanner />

      {/* Global Navbar */}
      <Navbar
        currentRole={currentRole}
        onSelectRole={(role) => {
          setCurrentRole(role);
          if (role === 'counsellor') {
            setInCaseDetail(false);
          }
        }}
        currentLang={currentLang}
        onSelectLang={setCurrentLang}
        onOpenEmergency={() => setIsEmergencyOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20">
        {/* Victim Portal */}
        {currentRole === 'victim' && (
          <div className="space-y-4">
            {/* Victim Sub-Nav */}
            <div className="bg-white border-b border-slate-200">
              <div className="max-w-2xl mx-auto px-4 flex space-x-6 text-xs font-semibold">
                <button
                  onClick={() => setVictimTab('checkin')}
                  className={`py-3 border-b-2 transition ${
                    victimTab === 'checkin'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Weekly Check-In
                </button>
                <button
                  onClick={() => setVictimTab('onboard')}
                  className={`py-3 border-b-2 transition ${
                    victimTab === 'onboard'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Consent Wizard (Module 1)
                </button>
                <button
                  onClick={() => setVictimTab('profile')}
                  className={`py-3 border-b-2 transition ${
                    victimTab === 'profile'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Privacy Controls (Module 24)
                </button>
                <button
                  onClick={() => setVictimTab('audit')}
                  className={`py-3 border-b-2 transition ${
                    victimTab === 'audit'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Activity Audit (Module 23)
                </button>
              </div>
            </div>

            {victimTab === 'checkin' && (
              <VictimCheckIn
                victimPseudoId={victimPseudoId}
                caseId={activeCaseId}
                lang={currentLang}
                onOpenEmergency={() => setIsEmergencyOpen(true)}
              />
            )}

            {victimTab === 'onboard' && (
              <VictimOnboarding
                lang={currentLang}
                onCompleted={(pId) => {
                  setVictimPseudoId(pId);
                  setVictimTab('checkin');
                }}
                onOpenEmergency={() => setIsEmergencyOpen(true)}
              />
            )}

            {victimTab === 'profile' && (
              <VictimProfile
                victimPseudoId={victimPseudoId}
                lang={currentLang}
              />
            )}

            {victimTab === 'audit' && (
              <VictimAudit
                caseId={activeCaseId}
              />
            )}
          </div>
        )}

        {/* Counsellor Portal */}
        {currentRole === 'counsellor' && (
          <div>
            {inCaseDetail ? (
              <CaseDetail
                caseId={activeCaseId}
                onBack={() => setInCaseDetail(false)}
                onOpenEmergency={() => setIsEmergencyOpen(true)}
              />
            ) : (
              <ReviewQueue
                onSelectCase={handleSelectCaseFromQueue}
              />
            )}
          </div>
        )}

        {/* District Dashboard */}
        {currentRole === 'district' && <DistrictDashboard />}

        {/* State Dashboard */}
        {currentRole === 'state' && <StateDashboard />}

        {/* National Dashboard */}
        {currentRole === 'national' && <NationalDashboard />}

        {/* Admin System Governance */}
        {currentRole === 'admin' && <AdminSystem />}
      </main>

      {/* Floating 1-Click SIH Demo Mode Panel (PRD §25) */}
      <DemoScenarioSelector onSelectScenario={handleSelectScenario} />

      {/* Static Emergency Modal (Principle #9) */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />
    </div>
  );
}

export default App;

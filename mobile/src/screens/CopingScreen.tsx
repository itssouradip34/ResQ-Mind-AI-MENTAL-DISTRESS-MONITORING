import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Wind, Shield, Play, Pause, RotateCcw, CheckCircle, Calendar, Sparkles, ArrowLeft } from 'lucide-react-native';
import { EmergencyNoticeBanner } from '../components/EmergencyNoticeBanner';

interface CopingScreenProps {
  onNavigateToCounsellors: () => void;
  onOpenSOS: () => void;
  onNavigateHome?: () => void;
}

type BreathingPhase = 'Inhale' | 'Hold (Full)' | 'Exhale' | 'Hold (Empty)';

export const CopingScreen: React.FC<CopingScreenProps> = ({
  onNavigateToCounsellors,
  onOpenSOS,
  onNavigateHome,
}) => {
  // Box Breathing state
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<BreathingPhase>('Inhale');
  const [countdown, setCountdown] = useState(4);
  const [completedCycles, setCompletedCycles] = useState(0);

  // 5-4-3-2-1 Grounding state
  const [groundingStep, setGroundingStep] = useState(0);

  const groundingSteps = [
    { num: 5, label: 'Look around: Name 5 things you can SEE', hint: 'e.g. A window, shadows, color on a wall, your hands, a tree' },
    { num: 4, label: 'Feel your body: Name 4 things you can TOUCH', hint: 'e.g. Feet on the floor, texture of your clothes, cool air, phone in hand' },
    { num: 3, label: 'Listen closely: Name 3 sounds you can HEAR', hint: 'e.g. Birds outside, distant vehicles, your steady breathing' },
    { num: 2, label: 'Breathe in: Name 2 things you can SMELL', hint: 'e.g. Fresh breeze, tea or soap, clean fabric' },
    { num: 1, label: 'Ground inward: Name 1 thing you APPRECIATE', hint: 'e.g. Your resilience, safety in this moment, a loved one who cares' },
  ];

  useEffect(() => {
    let timer: any = null;
    if (isActive) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev > 1) {
            return prev - 1;
          }
          // Advance phase
          advancePhase();
          return 4;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isActive, phase]);

  const advancePhase = () => {
    if (phase === 'Inhale') setPhase('Hold (Full)');
    else if (phase === 'Hold (Full)') setPhase('Exhale');
    else if (phase === 'Hold (Empty)') {
      setPhase('Inhale');
      setCompletedCycles((c) => c + 1);
    } else if (phase === 'Exhale') setPhase('Hold (Empty)');
  };

  const resetBreathing = () => {
    setIsActive(false);
    setPhase('Inhale');
    setCountdown(4);
    setCompletedCycles(0);
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'Inhale':
        return '#4F46E5';
      case 'Hold (Full)':
        return '#7C3AED';
      case 'Exhale':
        return '#059669';
      case 'Hold (Empty)':
        return '#D97706';
    }
  };

  return (
    <View style={styles.container}>
      <EmergencyNoticeBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {onNavigateHome && (
          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={onNavigateHome}
            activeOpacity={0.7}
          >
            <ArrowLeft size={16} color="#4F46E5" />
            <Text style={styles.backHomeBtnText}>← Back to Home Dashboard</Text>
          </TouchableOpacity>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>Nervous System Coping Tools</Text>
          <Text style={styles.subtitle}>
            Immediate physiological grounding micro-interventions for acute distress.
          </Text>
        </View>

        {/* BOX BREATHING SECTION (Requirement #7) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Wind size={20} color="#4F46E5" />
            <Text style={styles.cardTitle}>4-4-4-4 Box Breathing</Text>
          </View>
          <Text style={styles.cardDesc}>
            Vagus nerve stimulation: Slow 4-second box cycles down-regulate cortisol and stabilize heart-rate variability.
          </Text>

          {/* Visual Breathing Circle */}
          <View style={styles.breathingContainer}>
            <View style={[styles.breathingCircle, { borderColor: getPhaseColor() }]}>
              <Text style={[styles.phaseText, { color: getPhaseColor() }]}>{phase}</Text>
              <Text style={styles.countdownText}>{countdown}</Text>
              <Text style={styles.cycleBadge}>Cycle {completedCycles}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: isActive ? '#D97706' : '#4F46E5' }]}
              onPress={() => setIsActive(!isActive)}
            >
              {isActive ? <Pause size={18} color="#FFFFFF" /> : <Play size={18} color="#FFFFFF" />}
              <Text style={styles.playBtnText}>{isActive ? 'Pause' : 'Begin Breathing'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetBtn} onPress={resetBreathing}>
              <RotateCcw size={16} color="#64748B" />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5-4-3-2-1 SENSORY GROUNDING */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Sparkles size={20} color="#059669" />
            <Text style={styles.cardTitle}>5-4-3-2-1 Sensory Grounding</Text>
          </View>
          <Text style={styles.cardDesc}>
            When trauma memory or acute anxiety triggers dissociation, anchor your 5 physical senses.
          </Text>

          <View style={styles.groundingBox}>
            <View style={styles.groundingStepHeader}>
              <View style={styles.groundingBadge}>
                <Text style={styles.groundingBadgeText}>Step {groundingSteps[groundingStep].num}</Text>
              </View>
              <Text style={styles.groundingStepCount}>{groundingStep + 1} of 5</Text>
            </View>

            <Text style={styles.groundingMainText}>{groundingSteps[groundingStep].label}</Text>
            <Text style={styles.groundingHintText}>Suggestions: {groundingSteps[groundingStep].hint}</Text>

            <View style={styles.groundingNavRow}>
              {groundingStep > 0 && (
                <TouchableOpacity
                  style={styles.groundingPrevBtn}
                  onPress={() => setGroundingStep((s) => s - 1)}
                >
                  <Text style={styles.groundingPrevText}>Previous</Text>
                </TouchableOpacity>
              )}

              {groundingStep < 4 ? (
                <TouchableOpacity
                  style={[styles.groundingNextBtn, { flex: 1 }]}
                  onPress={() => setGroundingStep((s) => s + 1)}
                >
                  <Text style={styles.groundingNextText}>Next Sense</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.groundingNextBtn, { flex: 1, backgroundColor: '#059669' }]}
                  onPress={() => setGroundingStep(0)}
                >
                  <Text style={styles.groundingNextText}>Restart Grounding</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Escalation Pathways */}
        <View style={styles.cardEscalate}>
          <Text style={styles.escalateTitle}>Distress Still Unmanageable?</Text>
          <Text style={styles.escalateText}>
            If these techniques do not alleviate panic or acute distress, please reach out to your counsellor 
            or activate emergency support.
          </Text>

          <View style={styles.escalateButtons}>
            <TouchableOpacity style={styles.escalateBtnAppt} onPress={onNavigateToCounsellors}>
              <Calendar size={14} color="#1E40AF" />
              <Text style={styles.escalateBtnApptText}>Book Counsellor</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.escalateBtnSOS} onPress={onOpenSOS}>
              <Shield size={14} color="#FFFFFF" />
              <Text style={styles.escalateBtnSOSText}>Point 3 SOS Alert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  backHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  backHomeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4F46E5',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 16,
  },
  breathingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  breathingCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 4,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  phaseText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countdownText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 2,
  },
  cycleBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 8,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  resetBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  groundingBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
  },
  groundingStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groundingBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  groundingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  groundingStepCount: {
    fontSize: 11,
    color: '#64748B',
  },
  groundingMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  groundingHintText: {
    fontSize: 11.5,
    color: '#15803D',
    lineHeight: 16,
    marginBottom: 14,
  },
  groundingNavRow: {
    flexDirection: 'row',
    gap: 10,
  },
  groundingPrevBtn: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundingPrevText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  groundingNextBtn: {
    backgroundColor: '#166534',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundingNextText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  cardEscalate: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  escalateTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 4,
  },
  escalateText: {
    fontSize: 11.5,
    color: '#1E3A8A',
    lineHeight: 16,
    marginBottom: 12,
  },
  escalateButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  escalateBtnAppt: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  escalateBtnApptText: {
    color: '#1E40AF',
    fontWeight: '700',
    fontSize: 12,
  },
  escalateBtnSOS: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  escalateBtnSOSText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});

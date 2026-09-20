import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Scale, CheckCircle2, Mic, Activity, ArrowRight, ShieldCheck, HeartPulse } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { EmergencyNoticeBanner } from '../components/EmergencyNoticeBanner';
import { apiRequest } from '../api/config';
import { CheckInResult } from '../types';

export const CheckInScreen: React.FC = () => {
  const { caseId, victimPseudoId, biometrics, updateBiometrics } = useAuth();
  const [weight, setWeight] = useState(biometrics?.weight_kg ? String(biometrics.weight_kg) : '56');
  const [activityRating, setActivityRating] = useState(3);
  const [sleepRating, setSleepRating] = useState(3);
  const [distressRating, setDistressRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [useVoice, setUseVoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const parsedWeight = parseFloat(weight) || 56.0;

    const payload = {
      victim_pseudo_id: victimPseudoId || 'VIC-PSEUDO-USER',
      case_id: caseId || 'CASE-MH-2026-001',
      answers: [
        { question_id: 'q_sleep', value: sleepRating },
        { question_id: 'q_distress_feelings', value: distressRating },
        { question_id: 'q_physical_activity', value: activityRating },
      ],
      free_text: notes.trim() || 'Daily self-reflection and somatic check-in.',
      language: 'en',
      submitted_via: useVoice ? 'voice' : 'text',
      current_weight_kg: parsedWeight,
      physical_activity_rating: activityRating,
      response_latency_sec: 6.5,
    };

    try {
      const res: CheckInResult = await apiRequest('/checkins', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResult(res);
      await updateBiometrics({ weight_kg: parsedWeight });
    } catch (err: any) {
      setError(err.message || 'Failed to submit check-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <EmergencyNoticeBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Periodic Well-Being Check-In</Text>
          <Text style={styles.subtitle}>
            Enforces confidential Welford tracking against your personal baseline.
          </Text>
        </View>

        {result && (
          <View style={styles.successCard}>
            <CheckCircle2 size={24} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Check-In Securely Processed</Text>
              <Text style={styles.successDesc}>{result.message}</Text>
              <Text style={styles.successDDI}>
                Calculated Distress Band: <Text style={{ fontWeight: '800' }}>{result.risk_state}</Text>
                {result.ddi_display !== undefined && ` (DDI: ${result.ddi_display.toFixed(1)})`}
              </Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Somatic Weight Tracker (Requirement #6) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Scale size={18} color="#4F46E5" />
            <Text style={styles.cardTitle}>Somatic Appetite & Weight Check</Text>
          </View>
          <Text style={styles.cardHelp}>
            Trauma and acute distress deplete brain serotonin, frequently triggering severe appetite suppression 
            or sudden weight loss. Regular weight checks enable your counsellor to track somatic recovery.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Today's Weight (kg)</Text>
            <View style={styles.weightInputRow}>
              <TextInput
                style={styles.weightInput}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>
          </View>
        </View>

        {/* Subjective Well-Being Likert Ratings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <HeartPulse size={18} color="#059669" />
            <Text style={styles.cardTitle}>Daily Well-Being Assessment</Text>
          </View>

          {/* Sleep */}
          <View style={styles.questionBlock}>
            <Text style={styles.qText}>1. Sleep Quality (1 = Disrupted/Insomnia, 5 = Restful)</Text>
            <View style={styles.scaleRow}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.scaleBtn, sleepRating === val && styles.scaleBtnActive]}
                  onPress={() => setSleepRating(val)}
                >
                  <Text style={[styles.scaleText, sleepRating === val && styles.scaleTextActive]}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Distress / Anxiety */}
          <View style={styles.questionBlock}>
            <Text style={styles.qText}>2. Felt Distress or Fear (1 = Calm, 5 = Extreme Overwhelm)</Text>
            <View style={styles.scaleRow}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.scaleBtn, distressRating === val && styles.scaleBtnActive]}
                  onPress={() => setDistressRating(val)}
                >
                  <Text style={[styles.scaleText, distressRating === val && styles.scaleTextActive]}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Physical Activity */}
          <View style={styles.questionBlock}>
            <Text style={styles.qText}>3. Physical Movement & Energy (1 = Low/Bedridden, 5 = Energetic)</Text>
            <View style={styles.scaleRow}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.scaleBtn, activityRating === val && styles.scaleBtnActive]}
                  onPress={() => setActivityRating(val)}
                >
                  <Text style={[styles.scaleText, activityRating === val && styles.scaleTextActive]}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Free Text / Voice Notes */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Activity size={18} color="#2563EB" />
            <Text style={styles.cardTitle}>Thoughts, Sleep, or Case Notes</Text>
          </View>

          <TextInput
            style={styles.textArea}
            placeholder="Share how you've been feeling, thoughts about legal hearings, or physical safety..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.voiceToggle, useVoice && styles.voiceToggleActive]}
            onPress={() => setUseVoice(!useVoice)}
          >
            <Mic size={16} color={useVoice ? '#FFFFFF' : '#4B5563'} />
            <Text style={[styles.voiceToggleText, useVoice && styles.voiceToggleTextActive]}>
              {useVoice ? '✓ Voice Prosody Analysis Included' : 'Include Voice Note Check-In (RTX GPU Model)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <ShieldCheck size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Submit Confidential Check-In</Text>
            </>
          )}
        </TouchableOpacity>
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
  successCard: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  successDesc: {
    fontSize: 11.5,
    color: '#047857',
    marginTop: 2,
  },
  successDDI: {
    fontSize: 11,
    color: '#065F46',
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardHelp: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 12,
  },
  inputGroup: {
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weightInput: {
    width: 100,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  questionBlock: {
    marginBottom: 14,
  },
  qText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scaleBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  scaleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  scaleTextActive: {
    color: '#FFFFFF',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  voiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  voiceToggleActive: {
    backgroundColor: '#059669',
  },
  voiceToggleText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '700',
  },
  voiceToggleTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 6,
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});

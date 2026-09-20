import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { UserPlus, Shield, HeartPulse, Phone, Scale, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { EmergencyNoticeBanner } from '../components/EmergencyNoticeBanner';
import { schedule12HourInactivityReminder } from '../services/NotificationService';

interface SignupScreenProps {
  onNavigateToLogin: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ onNavigateToLogin }) => {
  const { signup, isLoading } = useAuth();

  // Basic Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Biometrics (Requirement #5 & #6)
  const [age, setAge] = useState('26');
  const [height, setHeight] = useState('164');
  const [weight, setWeight] = useState('56');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'moderate' | 'active'>('moderate');

  // Mental State Baseline Questions (Requirement #5)
  const [q1Sleep, setQ1Sleep] = useState(3);
  const [q2Safety, setQ2Safety] = useState(3);
  const [q3Appetite, setQ3Appetite] = useState(3);

  // 3 Emergency Contacts (Requirement #3 / Point 3)
  const [c1Name, setC1Name] = useState('');
  const [c1Phone, setC1Phone] = useState('');
  const [c1Rel, setC1Rel] = useState('Family');

  const [c2Name, setC2Name] = useState('');
  const [c2Phone, setC2Phone] = useState('');
  const [c2Rel, setC2Rel] = useState('Friend');

  const [c3Name, setC3Name] = useState('');
  const [c3Phone, setC3Phone] = useState('');
  const [c3Rel, setC3Rel] = useState('Community');

  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleCompleteSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all mandatory account credentials.');
      setStep(1);
      return;
    }

    if (!c1Phone.trim() || !c1Name.trim()) {
      setError('Contact 1 is mandatory for Point 3 emergency automated calling.');
      setStep(3);
      return;
    }

    setError(null);

    const emergencyContacts = [
      { name: c1Name.trim(), phone: c1Phone.trim(), relationship: c1Rel.trim() || 'Primary' },
      { name: c2Name.trim() || 'Secondary Contact', phone: c2Phone.trim() || c1Phone.trim(), relationship: c2Rel.trim() || 'Friend' },
      { name: c3Name.trim() || 'Community Contact', phone: c3Phone.trim() || c1Phone.trim(), relationship: c3Rel.trim() || 'Community' },
    ];

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone.trim() || '0000000000',
      age: parseInt(age, 10) || 26,
      height_cm: parseFloat(height) || 165.0,
      weight_kg: parseFloat(weight) || 58.0,
      activity_level: activityLevel,
      preferred_language: 'en',
      emergency_contacts: emergencyContacts,
      initial_assessment: {
        sleep_rating: q1Sleep,
        safety_rating: q2Safety,
        appetite_rating: q3Appetite,
      },
    };

    try {
      await signup(payload);
      // Requirement #5: Schedule 12-hour inactivity recovery reminder
      await schedule12HourInactivityReminder(name.trim());
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <EmergencyNoticeBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Back & Header */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={onNavigateToLogin} style={styles.backBtn}>
            <ArrowLeft size={20} color="#4F46E5" />
            <Text style={styles.backBtnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Confidential Enrolment</Text>
          <Text style={styles.subtitle}>
            Step {step} of 3: {step === 1 ? 'Account Setup' : step === 2 ? 'Biometric & Somatic Profile' : '3 Emergency Contacts (Point 3)'}
          </Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepBar}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* STEP 1: Basic Credentials */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardSection}>1. Confidential Account</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Pooja Kamble"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="victim@domain.org"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="98XXXXXXXX"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 8 characters"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}>
              <Text style={styles.primaryBtnText}>Next: Biometric Assessment</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Biometrics & Mental State (Req #5 & #6) */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardSection}>2. Biometric & Mental State Baseline</Text>
            <Text style={styles.infoNote}>
              💡 Serotonin synthesis and stress reactivity correlate directly with metabolic intake and regular weight checks.
            </Text>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="26"
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="165"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Weight (kg) - Somatic Appetite Tracker</Text>
              <TextInput
                style={styles.input}
                placeholder="56"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </View>

            <Text style={styles.label}>Physical Activity Level</Text>
            <View style={styles.pillRow}>
              {(['sedentary', 'moderate', 'active'] as const).map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.pill, activityLevel === lvl && styles.pillActive]}
                  onPress={() => setActivityLevel(lvl)}
                >
                  <Text style={[styles.pillText, activityLevel === lvl && styles.pillTextActive]}>
                    {lvl.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Questions for login threshold judging mental state (Req #5) */}
            <View style={styles.questionBox}>
              <Text style={styles.questionTitle}>Sleep Quality & Restfulness (1 = Poor, 5 = Deep)</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[styles.ratingDot, q1Sleep === num && styles.ratingDotActive]}
                    onPress={() => setQ1Sleep(num)}
                  >
                    <Text style={[styles.ratingDotText, q1Sleep === num && styles.ratingDotTextActive]}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.questionBox}>
              <Text style={styles.questionTitle}>Sense of Safety & Groundedness (1 = Constant fear, 5 = Secure)</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[styles.ratingDot, q2Safety === num && styles.ratingDotActive]}
                    onPress={() => setQ2Safety(num)}
                  >
                    <Text style={[styles.ratingDotText, q2Safety === num && styles.ratingDotTextActive]}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginLeft: 10 }]} onPress={() => setStep(3)}>
                <Text style={styles.primaryBtnText}>Next: 3 Emergency Contacts</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: 3 Emergency Contacts (Point 3) */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardSection}>3. Point 3: Select 3 Emergency Contacts</Text>
            <View style={styles.point3AlertBox}>
              <Text style={styles.point3AlertTitle}>🚨 CRITICAL POINT 3 SETUP:</Text>
              <Text style={styles.point3AlertDesc}>
                Contact 1 receives an IMMEDIATE AUTOMATED CALL with an AI Voice stating:
                "{'Call back to ' + (name || 'User') + ' immediately'}".
                All 3 contacts receive an immediate URGENT SMS broadcast with your location.
              </Text>
            </View>

            {/* Contact 1 */}
            <View style={styles.contactCard}>
              <Text style={styles.contactBadge}>CONTACT 1 (AUTOMATED AI CALL + SMS)</Text>
              <TextInput
                style={styles.subInput}
                placeholder="Full Name (e.g. Brother, Parent)"
                placeholderTextColor="#9CA3AF"
                value={c1Name}
                onChangeText={setC1Name}
              />
              <TextInput
                style={styles.subInput}
                placeholder="Phone Number (10 digits)"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={c1Phone}
                onChangeText={setC1Phone}
              />
            </View>

            {/* Contact 2 */}
            <View style={styles.contactCard}>
              <Text style={[styles.contactBadge, { color: '#2563EB', backgroundColor: '#EFF6FF' }]}>
                CONTACT 2 (AUTOMATED SMS ALERT)
              </Text>
              <TextInput
                style={styles.subInput}
                placeholder="Full Name (e.g. Trusted Friend)"
                placeholderTextColor="#9CA3AF"
                value={c2Name}
                onChangeText={setC2Name}
              />
              <TextInput
                style={styles.subInput}
                placeholder="Phone Number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={c2Phone}
                onChangeText={setC2Phone}
              />
            </View>

            {/* Contact 3 */}
            <View style={styles.contactCard}>
              <Text style={[styles.contactBadge, { color: '#059669', backgroundColor: '#ECFDF5' }]}>
                CONTACT 3 (AUTOMATED SMS ALERT)
              </Text>
              <TextInput
                style={styles.subInput}
                placeholder="Full Name (e.g. Gram Panchayat / Community Aid)"
                placeholderTextColor="#9CA3AF"
                value={c3Name}
                onChangeText={setC3Name}
              />
              <TextInput
                style={styles.subInput}
                placeholder="Phone Number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={c3Phone}
                onChangeText={setC3Phone}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(2)}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, marginLeft: 10 }, isLoading && styles.disabledBtn]}
                onPress={handleCompleteSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Complete Enrolment & Activate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? Math.max(StatusBar.currentHeight || 0, 36) + 6 : 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  navRow: {
    marginBottom: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 13,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
  },
  stepDotActive: {
    backgroundColor: '#4F46E5',
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E8F0',
  },
  stepLineActive: {
    backgroundColor: '#4F46E5',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSection: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  infoNote: {
    fontSize: 11.5,
    color: '#475569',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    lineHeight: 16,
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
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  rowTwo: {
    flexDirection: 'row',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  questionBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  questionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingDot: {
    width: 38,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingDotActive: {
    backgroundColor: '#4F46E5',
  },
  ratingDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  ratingDotTextActive: {
    color: '#FFFFFF',
  },
  point3AlertBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  point3AlertTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
    marginBottom: 4,
  },
  point3AlertDesc: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 15,
  },
  contactCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 12,
  },
  contactBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  subInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12.5,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  secondaryBtn: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
});

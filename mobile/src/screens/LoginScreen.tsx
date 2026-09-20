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
import { Shield, Lock, Mail, ArrowRight, HeartPulse } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { EmergencyNoticeBanner } from '../components/EmergencyNoticeBanner';

interface LoginScreenProps {
  onNavigateToSignup: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToSignup }) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('mobile_victim_test@resqmind.org');
  const [password, setPassword] = useState('SecurePassword123!');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const setDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('SecurePassword123!');
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <EmergencyNoticeBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.iconCircle}>
            <HeartPulse size={36} color="#4F46E5" />
          </View>
          <Text style={styles.brandTitle}>RESQ-MIND</Text>
          <Text style={styles.brandSubtitle}>Well-Being & Distress Intelligence System</Text>
          <Text style={styles.confidentialBadge}>🔒 CONFIDENTIAL & END-TO-END ENCRYPTED</Text>
        </View>

        {/* Login Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Victim & Survivor Login</Text>
          <Text style={styles.cardDesc}>
            Log in to view your well-being timeline, access the AI support assistant, and connect with counsellors.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <Mail size={18} color="#6B7280" style={styles.inputIcon} />
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
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Lock size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.disabledBtn]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Secure Sign In</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.signupPrompt}>
            <Text style={styles.signupPromptText}>New to RESQ-MIND?</Text>
            <TouchableOpacity onPress={onNavigateToSignup}>
              <Text style={styles.signupLink}> Create Account & Complete Assessment</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Demo Quick Access */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>DEMO QUICK SELECTION</Text>
          <View style={styles.demoButtons}>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => setDemoUser('mobile_victim_test@resqmind.org')}
            >
              <Text style={styles.demoBtnText}>Victim: Pooja Kamble</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => setDemoUser('counsellor_deshmukh@resqmind.org')}
            >
              <Text style={styles.demoBtnText}>Counsellor: Dr. Deshmukh</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingVertical: 24,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 2,
  },
  confidentialBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
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
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0F172A',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signupPromptText: {
    fontSize: 12,
    color: '#64748B',
  },
  signupLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  demoSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  demoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  demoBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
});

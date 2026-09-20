import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Settings,
  Server,
  Users,
  ShieldCheck,
  LogOut,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { EmergencyNoticeBanner } from '../components/EmergencyNoticeBanner';
import { getBaseApiUrl, setBaseApiUrl } from '../api/config';
import { PersonalEmergencyContact } from '../types';

export const SettingsScreen: React.FC = () => {
  const { user, caseId, emergencyContacts, updateEmergencyContacts, biometrics, logout } = useAuth();
  const [apiUrl, setApiUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Editable contacts state
  const [contacts, setContacts] = useState<PersonalEmergencyContact[]>([]);

  useEffect(() => {
    async function loadUrl() {
      const url = await getBaseApiUrl();
      setApiUrl(url);
    }
    loadUrl();
    setContacts(emergencyContacts);
  }, [emergencyContacts]);

  const handleSaveApiUrl = async () => {
    try {
      await setBaseApiUrl(apiUrl);
      setSaveStatus('✓ Backend API URL updated successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      Alert.alert('Error', 'Failed to save API URL.');
    }
  };

  const handleSaveContacts = async () => {
    try {
      await updateEmergencyContacts(contacts);
      setSaveStatus('✓ Emergency Contacts updated successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      Alert.alert('Error', 'Failed to save emergency contacts.');
    }
  };

  const updateContactField = (idx: number, field: keyof PersonalEmergencyContact, value: string) => {
    setContacts((prev) => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = { ...copy[idx], [field]: value };
      }
      return copy;
    });
  };

  return (
    <View style={styles.container}>
      <EmergencyNoticeBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings & Safety Preferences</Text>
          <Text style={styles.subtitle}>
            Manage Point 3 emergency contacts, LAN network configuration, and privacy.
          </Text>
        </View>

        {saveStatus && (
          <View style={styles.savedBanner}>
            <CheckCircle2 size={16} color="#059669" />
            <Text style={styles.savedText}>{saveStatus}</Text>
          </View>
        )}

        {/* Backend API Server Configuration */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Server size={18} color="#4F46E5" />
            <Text style={styles.cardTitle}>Backend Server Configuration (Expo Go)</Text>
          </View>
          <Text style={styles.cardDesc}>
            If testing on a physical phone via Expo Go, set this to your computer's local Wi-Fi IP 
            (e.g., http://192.168.1.X:8000). For Android Emulator, use http://10.0.2.2:8000.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Backend Base URL</Text>
            <TextInput
              style={styles.input}
              placeholder="http://192.168.1.X:8000"
              placeholderTextColor="#9CA3AF"
              value={apiUrl}
              onChangeText={setApiUrl}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApiUrl}>
            <Save size={14} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Save API Server URL</Text>
          </TouchableOpacity>
        </View>

        {/* 3 Emergency Contacts (Point 3) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={18} color="#DC2626" />
            <Text style={styles.cardTitle}>Point 3: Three Trusted Contacts</Text>
          </View>
          <Text style={styles.cardDesc}>
            Contact 1 is called immediately by the AI Voice automated dispatcher when SOS is triggered. 
            All 3 contacts receive automated SMS alerts.
          </Text>

          {contacts.slice(0, 3).map((contact, idx) => (
            <View key={idx} style={styles.contactEditBox}>
              <Text style={styles.contactLabel}>
                {idx === 0 ? '🚨 Contact 1 (Gets AI Voice Call + SMS)' : `Contact ${idx + 1} (Gets SMS)`}
              </Text>
              <TextInput
                style={styles.subInput}
                placeholder="Full Name"
                placeholderTextColor="#9CA3AF"
                value={contact.name}
                onChangeText={(val) => updateContactField(idx, 'name', val)}
              />
              <TextInput
                style={styles.subInput}
                placeholder="Phone Number (10 digits)"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={contact.phone}
                onChangeText={(val) => updateContactField(idx, 'phone', val)}
              />
            </View>
          ))}

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#DC2626' }]} onPress={handleSaveContacts}>
            <Save size={14} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Save Emergency Contacts</Text>
          </TouchableOpacity>
        </View>

        {/* Biometric & Somatic Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={18} color="#059669" />
            <Text style={styles.cardTitle}>Enrolled Somatic Baseline</Text>
          </View>
          <Text style={styles.cardDesc}>
            Used for Welford algorithm personal baseline comparisons:
          </Text>

          <View style={styles.bioGrid}>
            <View style={styles.bioItem}>
              <Text style={styles.bioLabel}>Baseline Weight</Text>
              <Text style={styles.bioVal}>{biometrics?.weight_kg || 56} kg</Text>
            </View>
            <View style={styles.bioItem}>
              <Text style={styles.bioLabel}>Height</Text>
              <Text style={styles.bioVal}>{biometrics?.height_cm || 165} cm</Text>
            </View>
            <View style={styles.bioItem}>
              <Text style={styles.bioLabel}>Activity</Text>
              <Text style={styles.bioVal}>{biometrics?.activity_level?.toUpperCase() || 'MODERATE'}</Text>
            </View>
          </View>
        </View>

        {/* Privacy by Design */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Lock size={18} color="#475569" />
            <Text style={styles.cardTitle}>Privacy & DPDP Compliance</Text>
          </View>
          <Text style={styles.privacyText}>
            • Principle #3 (Consent-First): Active consent status registered.{'\n'}
            • Real PII (Name, Phone) is isolated in encrypted IdentityStore.{'\n'}
            • Zero demographic/caste attributes collected or stored.{'\n'}
            • Transparent AI: Every distress band is an estimate with human counsellor review.
          </Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={16} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Sign Out of RESQ-MIND</Text>
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
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  savedText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
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
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
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
  contactEditBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  bioGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  bioItem: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  bioLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  bioVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  privacyText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
    gap: 8,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
});

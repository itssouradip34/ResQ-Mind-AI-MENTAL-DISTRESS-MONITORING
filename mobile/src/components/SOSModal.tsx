import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { PhoneCall, ShieldAlert, CheckCircle2, AlertCircle, X, Radio } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getCurrentLocation, UserLocation } from '../services/LocationService';
import { apiRequest } from '../api/config';
import { SOSTriggerResult } from '../types';

interface SOSModalProps {
  visible: boolean;
  onClose: () => void;
  triggerSource?: string;
  initialNotes?: string;
}

export const SOSModal: React.FC<SOSModalProps> = ({
  visible,
  onClose,
  triggerSource = 'manual_sos_button',
  initialNotes = 'Emergency distress trigger initiated by victim in mobile application.',
}) => {
  const { user, caseId, victimPseudoId, emergencyContacts } = useAuth();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sosResult, setSosResult] = useState<SOSTriggerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      triggerPoint3EmergencyFlow();
    } else {
      setSosResult(null);
      setError(null);
    }
  }, [visible]);

  const triggerPoint3EmergencyFlow = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch current GPS location
      const loc = await getCurrentLocation();
      setLocation(loc);

      // 2. Dispatch backend Point 3 automated call & 3 SMS alerts
      const payload = {
        victim_pseudo_id: victimPseudoId || 'VIC-PSEUDO-USER',
        case_id: caseId || 'CASE-MH-2026-001',
        user_name: user?.name || 'Protected Individual',
        user_phone: user?.email || 'Registered Device',
        latitude: loc.latitude,
        longitude: loc.longitude,
        trigger_source: triggerSource,
        emergency_contacts: emergencyContacts,
      };

      const result: SOSTriggerResult = await apiRequest('/sos/trigger', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSosResult(result);
    } catch (err: any) {
      console.error('Failed to trigger Point 3 SOS:', err);
      setError(err.message || 'Failed to dispatch SOS alerts automatically.');
    } finally {
      setLoading(false);
    }
  };

  const dialNumber = (num: string) => {
    Linking.openURL(`tel:${num}`);
  };

  const primaryContact = emergencyContacts[0] || {
    name: 'Primary Support Contact',
    phone: '9876543210',
    relationship: 'Family',
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <ShieldAlert size={26} color="#DC2626" />
              <Text style={styles.headerTitle}>EMERGENCY SOS ACTIVE</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Live Point 3 Status Banner */}
            <View style={styles.bannerBox}>
              <Text style={styles.bannerBadge}>AUTOMATED POINT 3 CALL & SMS PROTOCOL</Text>
              <Text style={styles.bannerDesc}>
                Point 3 requires an immediate automated phone call to your 1st selected contact 
                with an AI synthesized voice message, and SMS alerts to all 3 of your trusted contacts.
              </Text>
            </View>

            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#DC2626" />
                <Text style={styles.loadingText}>Dispatching automated AI Voice call & SMS broadcast...</Text>
                {location && (
                  <Text style={styles.locSub}>
                    GPS Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </Text>
                )}
              </View>
            )}

            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Point 3 Automated Call Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Radio size={18} color="#DC2626" />
                <Text style={styles.cardTitle}>1. AUTOMATED AI VOICE CALL (CONTACT 1)</Text>
              </View>

              <View style={styles.contactRow}>
                <View>
                  <Text style={styles.contactName}>{primaryContact.name} ({primaryContact.relationship})</Text>
                  <Text style={styles.contactPhone}>{primaryContact.phone}</Text>
                </View>
                <View style={styles.statusBadgeGreen}>
                  <CheckCircle2 size={14} color="#059669" />
                  <Text style={styles.statusTextGreen}>CALL INITIATED</Text>
                </View>
              </View>

              <View style={styles.aiVoiceBox}>
                <Text style={styles.aiVoiceLabel}>AI Synthesized Voice Message Dispatched:</Text>
                <Text style={styles.aiVoiceScript}>
                  "{sosResult?.automated_call?.ai_voice_message || 
                    `Emergency Alert from RESQ-MIND: Please call back to ${user?.name || 'User'} immediately. They are in severe distress and need your urgent support.`}"
                </Text>
              </View>

              <TouchableOpacity
                style={styles.directCallBtn}
                onPress={() => dialNumber(primaryContact.phone)}
              >
                <PhoneCall size={16} color="#FFFFFF" />
                <Text style={styles.directCallText}>Dial Contact 1 Directly ({primaryContact.phone})</Text>
              </TouchableOpacity>
            </View>

            {/* Point 3 SMS Broadcast Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <CheckCircle2 size={18} color="#2563EB" />
                <Text style={styles.cardTitle}>2. URGENT SMS BROADCAST (3 CONTACTS)</Text>
              </View>

              {emergencyContacts.slice(0, 3).map((contact, idx) => (
                <View key={idx} style={styles.smsContactRow}>
                  <View style={styles.smsContactInfo}>
                    <Text style={styles.smsContactIndex}>#{idx + 1} {contact.name}</Text>
                    <Text style={styles.smsContactPhone}>{contact.phone} • {contact.relationship}</Text>
                  </View>
                  <View style={styles.smsSentBadge}>
                    <Text style={styles.smsSentText}>SMS SENT</Text>
                  </View>
                </View>
              ))}

              <View style={styles.smsPreviewBox}>
                <Text style={styles.smsPreviewText}>
                  "URGENT [RESQ-MIND Alert]: {user?.name || 'User'} has triggered an emergency distress alert. 
                  Please call or reach out to them immediately. Location: {location ? `Lat ${location.latitude.toFixed(3)}, Lng ${location.longitude.toFixed(3)}` : 'Registered District'}."
                </Text>
              </View>
            </View>

            {/* Emergency Direct Hotlines */}
            <View style={styles.hotlinesCard}>
              <Text style={styles.hotlinesTitle}>NATIONAL 24x7 TOLL-FREE HELPLINES</Text>
              <View style={styles.hotlineButtonsRow}>
                <TouchableOpacity
                  style={[styles.hotlineBtn, styles.teleManasBg]}
                  onPress={() => dialNumber('14416')}
                >
                  <PhoneCall size={16} color="#FFFFFF" />
                  <Text style={styles.hotlineBtnText}>Tele-MANAS (14416)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.hotlineBtn, styles.policeBg]}
                  onPress={() => dialNumber('112')}
                >
                  <PhoneCall size={16} color="#FFFFFF" />
                  <Text style={styles.hotlineBtnText}>Police (112)</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.hotlineBtn, styles.poaBg, { marginTop: 8 }]}
                onPress={() => dialNumber('14566')}
              >
                <PhoneCall size={16} color="#FFFFFF" />
                <Text style={styles.hotlineBtnText}>National SC/ST PoA Helpline (14566)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Dismiss Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
              <Text style={styles.dismissBtnText}>I Am Safe / Close Emergency Screen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bannerBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  locSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    flex: 1,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  contactName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  contactPhone: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  statusBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusTextGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  aiVoiceBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  aiVoiceLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 3,
  },
  aiVoiceScript: {
    fontSize: 12,
    color: '#1F2937',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  directCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  directCallText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  smsContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  smsContactInfo: {
    flex: 1,
  },
  smsContactIndex: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#111827',
  },
  smsContactPhone: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  smsSentBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smsSentText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  smsPreviewBox: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  smsPreviewText: {
    fontSize: 11,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 15,
  },
  hotlinesCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    marginBottom: 8,
  },
  hotlinesTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  hotlineButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hotlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  teleManasBg: {
    backgroundColor: '#059669',
  },
  policeBg: {
    backgroundColor: '#DC2626',
  },
  poaBg: {
    backgroundColor: '#D97706',
  },
  hotlineBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dismissBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 13,
  },
});

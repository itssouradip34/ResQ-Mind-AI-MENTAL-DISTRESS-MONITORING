import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  ShieldAlert,
  MessageSquare,
  ClipboardCheck,
  Users,
  Wind,
  BellRing,
  Scale,
  Activity,
  Heart,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { EmergencyNoticeBanner } from '../components/EmergencyNoticeBanner';
import { apiRequest } from '../api/config';
import { triggerImmediateCheckInDemo } from '../services/NotificationService';

interface HomeScreenProps {
  onOpenSOS: () => void;
  onNavigate: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenSOS, onNavigate }) => {
  const { user, caseId, biometrics } = useAuth();
  const [caseDetails, setCaseDetails] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationSentMessage, setNotificationSentMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      if (caseId) {
        const res = await apiRequest(`/cases/${caseId}`);
        setCaseDetails(res);
      }
    } catch (e) {
      console.warn('Failed to fetch case status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [caseId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const handleTest12HNotification = async () => {
    await triggerImmediateCheckInDemo(user?.name);
    setNotificationSentMessage('✓ 12h Inactivity Recovery Reminder sent to notification tray!');
    setTimeout(() => setNotificationSentMessage(null), 4000);
  };

  const ddi = caseDetails?.distress_state?.ddi_display ?? 32.0;
  const riskState = caseDetails?.distress_state?.risk_state ?? 'LOW';

  const getBadgeColor = (state: string) => {
    switch (state) {
      case 'CRITICAL':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' };
      case 'HIGH':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'MEDIUM':
        return { bg: '#FEF9C3', text: '#854D0E', border: '#FEF08A' };
      default:
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
    }
  };

  const badgeStyle = getBadgeColor(riskState);

  return (
    <View style={styles.container}>
      <EmergencyNoticeBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* User Greeting & Status Bar */}
        <View style={styles.userHeader}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Care Participant'}</Text>
            <Text style={styles.caseBadge}>Confidential Case: {caseId || 'CASE-MH-2026-001'}</Text>
          </View>
          <View style={styles.districtTag}>
            <Text style={styles.districtText}>{user?.district_id || 'DIST-PUN-01'}</Text>
          </View>
        </View>

        {/* POINT 3 EMERGENCY SOS TRIGGER BANNER */}
        <TouchableOpacity style={styles.sosBanner} onPress={onOpenSOS} activeOpacity={0.88}>
          <View style={styles.sosInner}>
            <View style={styles.sosIconBox}>
              <ShieldAlert size={32} color="#FFFFFF" />
            </View>
            <View style={styles.sosTextBox}>
              <Text style={styles.sosTitle}>POINT 3: EMERGENCY SOS</Text>
              <Text style={styles.sosSubtitle}>
                Instant AI automated call to Contact 1 + SMS to 3 contacts
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {notificationSentMessage && (
          <View style={styles.notifBanner}>
            <Text style={styles.notifBannerText}>{notificationSentMessage}</Text>
          </View>
        )}

        {/* Well-Being & Somatic Overview */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Heart size={18} color="#4F46E5" />
            <Text style={styles.cardTitle}>Dynamic Well-Being Monitor</Text>
          </View>

          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.scoreValue}>{ddi.toFixed(1)}</Text>
              <Text style={styles.scoreLabel}>Distress Index (0 - 100)</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border }]}>
              <Text style={[styles.statusText, { color: badgeStyle.text }]}>
                {riskState === 'LOW' ? 'STABLE RECOVERY' : riskState}
              </Text>
            </View>
          </View>

          <Text style={styles.prototypeNotice}>
            * Algorithmic trajectory estimate. Never used as clinical diagnosis. Human review active.
          </Text>

          {/* Somatic Appetite / Serotonin Indicator (Req #6) */}
          <View style={styles.somaticBox}>
            <View style={styles.somaticHeader}>
              <Scale size={16} color="#059669" />
              <Text style={styles.somaticTitle}>Somatic Appetite & Nutrition Tracker</Text>
            </View>
            <Text style={styles.somaticDesc}>
              Current Weight: <Text style={{ fontWeight: '800' }}>{biometrics?.weight_kg || 56} kg</Text> (Height: {biometrics?.height_cm || 165} cm).
              Normal metabolic appetite recorded. Regular weight checks monitor serotonin stability.
            </Text>
          </View>
        </View>

        {/* 12-Hour Inactivity Notification Widget (Req #5) */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <BellRing size={18} color="#D97706" />
            <Text style={styles.reminderTitle}>12-Hour Inactivity Recovery System</Text>
          </View>
          <Text style={styles.reminderText}>
            If you do not log in for 12 hours, RESQ-MIND automatically sends you gentle notifications 
            to check if you are fine and how your recovery is progressing.
          </Text>
          <TouchableOpacity style={styles.testReminderBtn} onPress={handleTest12HNotification}>
            <Text style={styles.testReminderText}>Simulate 12h Inactivity Check Notification</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Action Navigation Grid */}
        <Text style={styles.sectionHeader}>SUPPORT & RECOVERY ACTIONS</Text>
        <View style={styles.grid}>
          {/* AI Chat Bot */}
          <TouchableOpacity style={styles.gridItem} onPress={() => onNavigate('Chat')}>
            <View style={[styles.gridIconBox, { backgroundColor: '#EEF2FF' }]}>
              <MessageSquare size={22} color="#4F46E5" />
            </View>
            <Text style={styles.gridTitle}>AI Chat Assistant</Text>
            <Text style={styles.gridSub}>Conversational support on RTX GPU</Text>
          </TouchableOpacity>

          {/* Daily Check-In */}
          <TouchableOpacity style={styles.gridItem} onPress={() => onNavigate('CheckIn')}>
            <View style={[styles.gridIconBox, { backgroundColor: '#ECFDF5' }]}>
              <ClipboardCheck size={22} color="#059669" />
            </View>
            <Text style={styles.gridTitle}>Self-Report & Weight</Text>
            <Text style={styles.gridSub}>Check-in & somatic tracking</Text>
          </TouchableOpacity>

          {/* Nearby Counsellors */}
          <TouchableOpacity style={styles.gridItem} onPress={() => onNavigate('Counsellors')}>
            <View style={[styles.gridIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Users size={22} color="#2563EB" />
            </View>
            <Text style={styles.gridTitle}>Nearby Counsellors</Text>
            <Text style={styles.gridSub}>GPS directory & appointments</Text>
          </TouchableOpacity>

          {/* Coping Tools */}
          <TouchableOpacity style={styles.gridItem} onPress={() => onNavigate('Coping')}>
            <View style={[styles.gridIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Wind size={22} color="#D97706" />
            </View>
            <Text style={styles.gridTitle}>Box Breathing</Text>
            <Text style={styles.gridSub}>Guided grounding exercises</Text>
          </TouchableOpacity>
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  caseBadge: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '700',
    marginTop: 2,
  },
  districtTag: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  districtText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  sosBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sosIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTextBox: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  sosSubtitle: {
    fontSize: 11.5,
    color: '#FEE2E2',
    marginTop: 2,
    lineHeight: 15,
  },
  notifBanner: {
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  notifBannerText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  prototypeNotice: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  somaticBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  somaticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  somaticTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#166534',
  },
  somaticDesc: {
    fontSize: 11,
    color: '#14532D',
    lineHeight: 15,
  },
  reminderCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  reminderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  reminderText: {
    fontSize: 11.5,
    color: '#78350F',
    lineHeight: 16,
    marginBottom: 10,
  },
  testReminderBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  testReminderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11.5,
  },
  sectionHeader: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  gridSub: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 14,
  },
});

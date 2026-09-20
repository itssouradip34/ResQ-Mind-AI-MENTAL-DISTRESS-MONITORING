import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  MapPin,
  PhoneCall,
  Calendar,
  Building2,
  CheckCircle2,
  Navigation,
  Clock,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { EmergencyNoticeBanner } from '../components/EmergencyNoticeBanner';
import { getCurrentLocation, UserLocation } from '../services/LocationService';
import { apiRequest } from '../api/config';
import { NearbyCounsellor, Appointment } from '../types';

interface CounsellorsScreenProps {
  onNavigateHome?: () => void;
}

export const CounsellorsScreen: React.FC<CounsellorsScreenProps> = ({ onNavigateHome }) => {
  const { caseId } = useAuth();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [counsellors, setCounsellors] = useState<NearbyCounsellor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCounsellor, setSelectedCounsellor] = useState<NearbyCounsellor | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);

  useEffect(() => {
    fetchNearbyDirectory();
  }, []);

  const fetchNearbyDirectory = async () => {
    setLoading(true);
    try {
      // Fetch GPS location
      const loc = await getCurrentLocation();
      setLocation(loc);

      const endpoint = `/counsellors/nearby?latitude=${loc.latitude}&longitude=${loc.longitude}&radius_km=50`;
      const data: NearbyCounsellor[] = await apiRequest(endpoint);
      setCounsellors(data);
    } catch (err) {
      console.warn('Failed to load nearby counsellors directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const dialPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const openBookingModal = (counsellor: NearbyCounsellor) => {
    setSelectedCounsellor(counsellor);
    setBookingNotes('');
    setBookingSuccess(null);
    setBookingModalVisible(true);
  };

  const submitAppointmentBooking = async () => {
    if (!selectedCounsellor) return;
    setBookingLoading(true);
    try {
      const payload = {
        case_id: caseId || 'CASE-MH-2026-001',
        counsellor_id: selectedCounsellor.id,
        preferred_date: new Date(Date.now() + 86400000 * 2).toISOString(),
        notes: bookingNotes.trim() || 'Victim initiated mobile consultation request.',
      };

      const res: Appointment = await apiRequest('/counsellors/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setBookingSuccess(res);
    } catch (err: any) {
      console.error('Failed to book appointment:', err);
    } finally {
      setBookingLoading(false);
    }
  };

  const renderItem = ({ item }: { item: NearbyCounsellor }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.counsellorName}>{item.name}</Text>
          <Text style={styles.counsellorTitle}>{item.title}</Text>
        </View>
        <View style={styles.distanceBadge}>
          <Navigation size={12} color="#4F46E5" />
          <Text style={styles.distanceText}>{item.distance_km.toFixed(1)} km</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Building2 size={14} color="#6B7280" />
        <Text style={styles.infoText}>{item.organization}</Text>
      </View>

      <View style={styles.infoRow}>
        <Clock size={14} color="#6B7280" />
        <Text style={styles.infoText}>{item.availability}</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.callBtn} onPress={() => dialPhone(item.phone)}>
          <PhoneCall size={14} color="#FFFFFF" />
          <Text style={styles.callBtnText}>Call ({item.phone})</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookBtn} onPress={() => openBookingModal(item)}>
          <Calendar size={14} color="#4F46E5" />
          <Text style={styles.bookBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <EmergencyNoticeBanner />

      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {onNavigateHome && (
            <TouchableOpacity
              style={styles.backHomeBtn}
              onPress={onNavigateHome}
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color="#4F46E5" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>GPS Counsellor Directory</Text>
            <Text style={styles.subtitle}>
              {location
                ? `📍 Verified facilities near ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`
                : 'Detecting location...'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchNearbyDirectory}>
          <Text style={styles.refreshText}>Refresh GPS</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Calculating nearest mental health & legal aid centres...</Text>
        </View>
      ) : (
        <FlatList
          data={counsellors}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No verified facilities found within this district radius.</Text>
            </View>
          }
        />
      )}

      {/* Booking Modal */}
      <Modal visible={bookingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confidential Consultation Request</Text>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {bookingSuccess ? (
              <View style={styles.successBox}>
                <CheckCircle2 size={32} color="#059669" />
                <Text style={styles.successHead}>Appointment Confirmed</Text>
                <Text style={styles.successSub}>{bookingSuccess.message}</Text>
                <Text style={styles.successTime}>Scheduled Time: {bookingSuccess.scheduled_time}</Text>
                <TouchableOpacity
                  style={styles.closeSuccessBtn}
                  onPress={() => setBookingModalVisible(false)}
                >
                  <Text style={styles.closeSuccessBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView>
                <Text style={styles.bookingWith}>
                  With: <Text style={{ fontWeight: '800' }}>{selectedCounsellor?.name}</Text>
                </Text>
                <Text style={styles.bookingOrg}>{selectedCounsellor?.organization}</Text>

                <Text style={styles.inputLabel}>Reason for Consultation / Distress Notes (Optional)</Text>
                <TextInput
                  style={styles.bookingInput}
                  placeholder="e.g. Anxiety regarding upcoming hearing, somatic sleep difficulties..."
                  placeholderTextColor="#9CA3AF"
                  value={bookingNotes}
                  onChangeText={setBookingNotes}
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity
                  style={[styles.confirmBtn, bookingLoading && styles.disabledBtn]}
                  onPress={submitAppointmentBooking}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Submit Appointment Request</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backHomeBtn: {
    padding: 6,
    marginRight: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  refreshBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  counsellorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  counsellorTitle: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontSize: 11.5,
    color: '#475569',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  bookBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  bookBtnText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  bookingWith: {
    fontSize: 13.5,
    color: '#1E293B',
    marginBottom: 2,
  },
  bookingOrg: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  bookingInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  confirmBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  successHead: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  successSub: {
    fontSize: 12.5,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 18,
  },
  successTime: {
    fontSize: 11.5,
    color: '#4F46E5',
    fontWeight: '700',
  },
  closeSuccessBtn: {
    marginTop: 12,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 6,
  },
  closeSuccessBtnText: {
    fontWeight: '700',
    color: '#334155',
  },
});

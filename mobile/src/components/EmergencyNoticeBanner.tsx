import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { AlertTriangle, PhoneCall } from 'lucide-react-native';

export const EmergencyNoticeBanner: React.FC = () => {
  const dial = (num: string) => {
    Linking.openURL(`tel:${num}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <AlertTriangle size={18} color="#D97706" style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>PROTOTYPE AI ESTIMATE — NOT A CLINICAL DIAGNOSIS</Text>
          <Text style={styles.desc}>
            Algorithmic well-being monitor with human-in-the-loop oversight. For crisis emergencies, 
            contact national helplines immediately:
          </Text>
        </View>
      </View>
      <View style={styles.helplineButtons}>
        <TouchableOpacity style={styles.btn} onPress={() => dial('14566')}>
          <PhoneCall size={14} color="#FFFFFF" />
          <Text style={styles.btnText}>PoA: 14566</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.teleManasBtn]} onPress={() => dial('14416')}>
          <PhoneCall size={14} color="#FFFFFF" />
          <Text style={styles.btnText}>Tele-MANAS: 14416</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.policeBtn]} onPress={() => dial('112')}>
          <PhoneCall size={14} color="#FFFFFF" />
          <Text style={styles.btnText}>Police: 112</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 10.5,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 14,
  },
  helplineButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 6,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B45309',
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  teleManasBtn: {
    backgroundColor: '#047857',
  },
  policeBtn: {
    backgroundColor: '#DC2626',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
});

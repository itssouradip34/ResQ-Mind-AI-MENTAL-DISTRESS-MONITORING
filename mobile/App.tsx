import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Home,
  MessageSquare,
  ClipboardCheck,
  Users,
  Wind,
  Settings as SettingsIcon,
  ShieldAlert,
} from 'lucide-react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ChatBotScreen } from './src/screens/ChatBotScreen';
import { CheckInScreen } from './src/screens/CheckInScreen';
import { CounsellorsScreen } from './src/screens/CounsellorsScreen';
import { CopingScreen } from './src/screens/CopingScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SOSModal } from './src/components/SOSModal';
import { registerForPushNotificationsAsync } from './src/services/NotificationService';

type ActiveTab = 'Home' | 'Chat' | 'CheckIn' | 'Counsellors' | 'Coping' | 'Settings';

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [currentTab, setCurrentTab] = useState<ActiveTab>('Home');
  const [sosModalVisible, setSosModalVisible] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading RESQ-MIND Secure Environment...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return authView === 'login' ? (
      <LoginScreen onNavigateToSignup={() => setAuthView('signup')} />
    ) : (
      <SignupScreen onNavigateToLogin={() => setAuthView('login')} />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Top Main Navigation Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandTitle}>RESQ-MIND</Text>
          <Text style={styles.brandSubtitle}>Well-Being Intelligence</Text>
        </View>

        {/* Prominent Always-Available SOS Button */}
        <TouchableOpacity
          style={styles.headerSosBtn}
          onPress={() => setSosModalVisible(true)}
          activeOpacity={0.85}
        >
          <ShieldAlert size={16} color="#FFFFFF" />
          <Text style={styles.headerSosText}>EMERGENCY SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Current Screen Content */}
      <View style={styles.content}>
        {currentTab === 'Home' && (
          <HomeScreen
            onOpenSOS={() => setSosModalVisible(true)}
            onNavigate={(tab) => setCurrentTab(tab as ActiveTab)}
          />
        )}
        {currentTab === 'Chat' && (
          <ChatBotScreen
            onTriggerSOS={() => setSosModalVisible(true)}
            onNavigateToCoping={() => setCurrentTab('Coping')}
            onNavigateToCounsellors={() => setCurrentTab('Counsellors')}
          />
        )}
        {currentTab === 'CheckIn' && <CheckInScreen />}
        {currentTab === 'Counsellors' && <CounsellorsScreen />}
        {currentTab === 'Coping' && (
          <CopingScreen
            onNavigateToCounsellors={() => setCurrentTab('Counsellors')}
            onOpenSOS={() => setSosModalVisible(true)}
          />
        )}
        {currentTab === 'Settings' && <SettingsScreen />}
      </View>

      {/* Bottom Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Home')}
        >
          <Home
            size={20}
            color={currentTab === 'Home' ? '#4F46E5' : '#64748B'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'Home' && styles.tabLabelActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Chat')}
        >
          <MessageSquare
            size={20}
            color={currentTab === 'Chat' ? '#4F46E5' : '#64748B'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'Chat' && styles.tabLabelActive,
            ]}
          >
            AI Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('CheckIn')}
        >
          <ClipboardCheck
            size={20}
            color={currentTab === 'CheckIn' ? '#4F46E5' : '#64748B'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'CheckIn' && styles.tabLabelActive,
            ]}
          >
            Check-In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Counsellors')}
        >
          <Users
            size={20}
            color={currentTab === 'Counsellors' ? '#4F46E5' : '#64748B'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'Counsellors' && styles.tabLabelActive,
            ]}
          >
            Counsellors
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Coping')}
        >
          <Wind
            size={20}
            color={currentTab === 'Coping' ? '#4F46E5' : '#64748B'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'Coping' && styles.tabLabelActive,
            ]}
          >
            Coping
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Settings')}
        >
          <SettingsIcon
            size={20}
            color={currentTab === 'Settings' ? '#4F46E5' : '#64748B'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'Settings' && styles.tabLabelActive,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Global Point 3 SOS Modal */}
      <SOSModal
        visible={sosModalVisible}
        onClose={() => setSosModalVisible(false)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 10.5,
    color: '#6366F1',
    fontWeight: '700',
  },
  headerSosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerSosText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
});

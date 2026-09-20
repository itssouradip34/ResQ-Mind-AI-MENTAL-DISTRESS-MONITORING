import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, setAuthToken, clearAuthToken } from '../api/config';
import { User, PersonalEmergencyContact, BiometricProfile } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  caseId: string | null;
  victimPseudoId: string | null;
  emergencyContacts: PersonalEmergencyContact[];
  biometrics: BiometricProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateEmergencyContacts: (contacts: PersonalEmergencyContact[]) => Promise<void>;
  updateBiometrics: (bio: Partial<BiometricProfile>) => Promise<void>;
}

const STORAGE_KEY_USER = '@resqmind_user';
const STORAGE_KEY_CONTACTS = '@resqmind_emergency_contacts';
const STORAGE_KEY_BIO = '@resqmind_biometrics';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [victimPseudoId, setVictimPseudoId] = useState<string | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<PersonalEmergencyContact[]>([
    { name: 'Primary Support Contact', phone: '9876543210', relationship: 'Family' },
    { name: 'Secondary Emergency Contact', phone: '9876543211', relationship: 'Friend' },
    { name: 'Local Trusted Community Aid', phone: '9876543212', relationship: 'Community' }
  ]);
  const [biometrics, setBiometrics] = useState<BiometricProfile | null>({
    age: 26,
    height_cm: 165,
    weight_kg: 58,
    activity_level: 'moderate',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Restore stored session
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await AsyncStorage.getItem('@resqmind_auth_token');
        const storedUser = await AsyncStorage.getItem(STORAGE_KEY_USER);
        const storedContacts = await AsyncStorage.getItem(STORAGE_KEY_CONTACTS);
        const storedBio = await AsyncStorage.getItem(STORAGE_KEY_BIO);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setTokenState(storedToken);
          setCaseId(parsedUser.case_id || 'CASE-MH-2026-001');
          setVictimPseudoId(parsedUser.victim_pseudo_id || 'VIC-PSEUDO-USER');
        }

        if (storedContacts) {
          setEmergencyContacts(JSON.parse(storedContacts));
        }

        if (storedBio) {
          setBiometrics(JSON.parse(storedBio));
        }
      } catch (err) {
        console.error('Error restoring session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const authToken = res.access_token;
      await setAuthToken(authToken);
      setTokenState(authToken);

      const resolvedUser: User = {
        id: res.user_id,
        email,
        name: res.name,
        role: res.role,
        district_id: res.district_id,
        state_id: res.state_id,
        victim_pseudo_id: res.victim_pseudo_id,
        case_id: res.case_id,
      };

      setUser(resolvedUser);
      setCaseId(res.case_id || 'CASE-MH-2026-001');
      setVictimPseudoId(res.victim_pseudo_id || 'VIC-PSEUDO-USER');

      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(resolvedUser));

      // Attempt to load victim profile safety preferences
      try {
        if (res.victim_pseudo_id) {
          const profile = await apiRequest(`/victims/${res.victim_pseudo_id}`);
          if (profile && profile.safety_preferences) {
            const prefs = profile.safety_preferences;
            if (prefs.emergency_contacts && prefs.emergency_contacts.length > 0) {
              setEmergencyContacts(prefs.emergency_contacts);
              await AsyncStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(prefs.emergency_contacts));
            }
            if (prefs.age || prefs.weight_kg) {
              const loadedBio: BiometricProfile = {
                age: prefs.age,
                height_cm: prefs.height_cm,
                weight_kg: prefs.weight_kg,
                activity_level: prefs.activity_level,
              };
              setBiometrics(loadedBio);
              await AsyncStorage.setItem(STORAGE_KEY_BIO, JSON.stringify(loadedBio));
            }
          }
        }
      } catch (e) {
        // Safe fallback if profile call is restricted
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const authToken = res.access_token;
      await setAuthToken(authToken);
      setTokenState(authToken);

      const resolvedUser: User = {
        id: res.user_id,
        email: data.email,
        name: res.name,
        role: res.role,
        district_id: res.district_id,
        state_id: res.state_id,
        victim_pseudo_id: res.victim_pseudo_id,
        case_id: res.case_id,
      };

      setUser(resolvedUser);
      setCaseId(res.case_id || 'CASE-MH-2026-001');
      setVictimPseudoId(res.victim_pseudo_id || 'VIC-PSEUDO-USER');

      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(resolvedUser));

      if (data.emergency_contacts && data.emergency_contacts.length > 0) {
        setEmergencyContacts(data.emergency_contacts);
        await AsyncStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(data.emergency_contacts));
      }

      const newBio: BiometricProfile = {
        age: data.age,
        height_cm: data.height_cm,
        weight_kg: data.weight_kg,
        activity_level: data.activity_level,
        initial_distress_rating: data.initial_distress_rating,
      };
      setBiometrics(newBio);
      await AsyncStorage.setItem(STORAGE_KEY_BIO, JSON.stringify(newBio));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await clearAuthToken();
    await AsyncStorage.removeItem(STORAGE_KEY_USER);
    setUser(null);
    setTokenState(null);
    setCaseId(null);
    setVictimPseudoId(null);
  };

  const updateEmergencyContacts = async (contacts: PersonalEmergencyContact[]) => {
    setEmergencyContacts(contacts);
    await AsyncStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
  };

  const updateBiometrics = async (bio: Partial<BiometricProfile>) => {
    setBiometrics((prev) => {
      const updated = { ...(prev || {}), ...bio };
      AsyncStorage.setItem(STORAGE_KEY_BIO, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        caseId,
        victimPseudoId,
        emergencyContacts,
        biometrics,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        signup,
        logout,
        updateEmergencyContacts,
        updateBiometrics,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

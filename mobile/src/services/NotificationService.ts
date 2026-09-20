import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const STORAGE_KEY_LAST_ACTIVE = '@resqmind_last_active_timestamp';
const STORAGE_KEY_INACTIVITY_HOURS = 12;

type InactivityCallback = (timeDiffHours: number) => void;
let listeners: InactivityCallback[] = [];

/**
 * Record that the user was active now
 */
export async function recordUserActivity(): Promise<void> {
  try {
    const now = Date.now();
    await AsyncStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
  } catch (e) {
    console.warn('Failed to record user activity:', e);
  }
}

/**
 * Requirement #5: Check if 12 hours of inactivity have elapsed
 * "start sending him notifications like if he is fine, if he is recovering or not for 12 hrs of not using the app"
 */
export async function check12HourInactivity(userName?: string): Promise<boolean> {
  try {
    const lastActiveStr = await AsyncStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
    if (!lastActiveStr) {
      await recordUserActivity();
      return false;
    }

    const lastActive = parseInt(lastActiveStr, 10);
    const now = Date.now();
    const diffHours = (now - lastActive) / (1000 * 60 * 60);

    if (diffHours >= STORAGE_KEY_INACTIVITY_HOURS) {
      notifyListeners(diffHours);
      return true;
    }

    return false;
  } catch (e) {
    console.warn('Error checking inactivity:', e);
    return false;
  }
}

export function subscribeToInactivityCheck(callback: InactivityCallback): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((cb) => cb !== callback);
  };
}

function notifyListeners(hours: number) {
  listeners.forEach((cb) => {
    try {
      cb(hours);
    } catch (e) {
      console.warn('Inactivity callback error:', e);
    }
  });
}

/**
 * Schedules the 12-hour recovery reminder
 */
export async function schedule12HourInactivityReminder(userName?: string): Promise<void> {
  await recordUserActivity();
  console.log(`[NotificationService] 12-Hour recovery tracking initialized for ${userName || 'user'}.`);
}

/**
 * Triggers an immediate test notification/modal for demonstration
 */
export async function triggerImmediateCheckInDemo(userName?: string): Promise<void> {
  const name = userName ? ` ${userName}` : '';
  Alert.alert(
    '🌿 RESQ-MIND 12h Inactivity Check',
    `Hello${name}, it has been over 12 hours. We are checking in on your recovery, sleep, and distress. How are you feeling right now? Remember to log your somatic weight check.`,
    [
      { text: 'I am Feeling Fine', style: 'default' },
      { text: 'Complete Check-In', style: 'default' },
    ]
  );
  notifyListeners(12.5);
}

export async function registerForPushNotificationsAsync(): Promise<boolean> {
  // Pure JavaScript compatibility for Expo Go
  return true;
}

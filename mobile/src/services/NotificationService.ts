import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for notification!');
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('wellbeing-reminders', {
        name: 'RESQ-MIND Well-Being Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    return true;
  } catch (e) {
    console.warn('Notification registration skipped or failed:', e);
    return false;
  }
}

/**
 * Requirement #5: Schedules 12-hour inactivity notification reminders
 * "start sending him notifications like if he is fine, if he is recovering or not for 12 hrs of not using the app"
 */
export async function schedule12HourInactivityReminder(userName?: string): Promise<string | null> {
  try {
    // Cancel existing scheduled reminders first
    await Notifications.cancelAllScheduledNotificationsAsync();

    const name = userName ? ` ${userName}` : '';

    // Schedule 12-hour reminder (12 hours = 12 * 3600 seconds = 43200 seconds)
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌿 RESQ-MIND Well-Being Check',
        body: `Hello${name}, we are checking in on your recovery and comfort. Take a quiet minute for your daily well-being & weight check-in.`,
        data: { screen: 'CheckIn' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 43200, // 12 hours
        repeats: true,
      },
    });

    console.log(`12-Hour recovery reminder scheduled successfully: ${id}`);
    return id;
  } catch (error) {
    console.warn('Could not schedule 12-hour reminder:', error);
    return null;
  }
}

/**
 * Triggers an immediate test notification for demonstration
 */
export async function triggerImmediateCheckInDemo(userName?: string): Promise<void> {
  try {
    const name = userName ? ` ${userName}` : '';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌿 RESQ-MIND 12h Inactivity Check',
        body: `Hello${name}, it has been 12 hours. How is your recovery and distress feeling right now? Tap to record your somatic weight & thoughts.`,
        data: { screen: 'CheckIn' },
        sound: true,
      },
      trigger: null, // send immediately
    });
  } catch (e) {
    console.warn('Immediate demo notification error:', e);
  }
}

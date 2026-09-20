import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY_EMERGENCY_PERMITTED = '@resqmind_emergency_telephony_authorized';

export interface EmergencyPermissionsStatus {
  callPhoneGranted: boolean;
  sendSmsGranted: boolean;
  locationGranted: boolean;
  allAuthorized: boolean;
}

/**
 * Request all required emergency permissions on Android:
 * - CALL_PHONE: to directly place emergency calls to Contact 1 without manual dialing
 * - SEND_SMS: to dispatch emergency SMS broadcasts to 3 contacts without waiting for manual confirmation
 * - ACCESS_FINE_LOCATION: to attach precise live GPS coordinates to distress broadcasts
 */
export const requestEmergencyTelephonyPermissions = async (): Promise<EmergencyPermissionsStatus> => {
  if (Platform.OS !== 'android') {
    await AsyncStorage.setItem(STORAGE_KEY_EMERGENCY_PERMITTED, 'true');
    return {
      callPhoneGranted: true,
      sendSmsGranted: true,
      locationGranted: true,
      allAuthorized: true,
    };
  }

  try {
    const permissionsToRequest = [
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);

    const callGranted = results[PermissionsAndroid.PERMISSIONS.CALL_PHONE] === PermissionsAndroid.RESULTS.GRANTED;
    const smsGranted = results[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;
    const locGranted = results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

    // Persist authorization flag
    await AsyncStorage.setItem(STORAGE_KEY_EMERGENCY_PERMITTED, 'true');

    return {
      callPhoneGranted: callGranted,
      sendSmsGranted: smsGranted,
      locationGranted: locGranted,
      allAuthorized: callGranted && smsGranted && locGranted,
    };
  } catch (error) {
    console.warn('Error requesting emergency permissions:', error);
    return {
      callPhoneGranted: false,
      sendSmsGranted: false,
      locationGranted: false,
      allAuthorized: false,
    };
  }
};

/**
 * Check if the user has previously authorized emergency automated protocols
 */
export const checkEmergencyPermissions = async (): Promise<EmergencyPermissionsStatus> => {
  if (Platform.OS !== 'android') {
    return {
      callPhoneGranted: true,
      sendSmsGranted: true,
      locationGranted: true,
      allAuthorized: true,
    };
  }

  try {
    const callGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
    const smsGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
    const locGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

    const storedPermitted = await AsyncStorage.getItem(STORAGE_KEY_EMERGENCY_PERMITTED);

    return {
      callPhoneGranted: callGranted,
      sendSmsGranted: smsGranted,
      locationGranted: locGranted,
      allAuthorized: Boolean(storedPermitted && (callGranted || locGranted)),
    };
  } catch (error) {
    console.warn('Error checking emergency permissions:', error);
    return {
      callPhoneGranted: false,
      sendSmsGranted: false,
      locationGranted: false,
      allAuthorized: false,
    };
  }
};

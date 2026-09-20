import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
  isSimulated: boolean;
}

// Default fallback coordinates (Pune, Maharashtra - Central district)
export const DEFAULT_COORDS: UserLocation = {
  latitude: 18.5204,
  longitude: 73.8567,
  isSimulated: true,
};

export async function getCurrentLocation(): Promise<UserLocation> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission not granted, using default district coordinates.');
      return DEFAULT_COORDS;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      isSimulated: false,
    };
  } catch (error) {
    console.warn('Failed to retrieve location from sensor, fallback to district coords:', error);
    return DEFAULT_COORDS;
  }
}

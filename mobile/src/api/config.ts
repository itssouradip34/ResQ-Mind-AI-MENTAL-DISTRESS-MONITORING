import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Default backend API URL
// In Android emulator: 10.0.2.2 points to host machine
// In Expo Go on physical device: Use PC's local IP, e.g., http://192.168.1.X:8000
export const DEFAULT_API_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://localhost:8000',
  default: 'http://localhost:8000',
});

const STORAGE_KEY_API_URL = '@resqmind_custom_api_url';
const STORAGE_KEY_TOKEN = '@resqmind_auth_token';

export async function getBaseApiUrl(): Promise<string> {
  try {
    const customUrl = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (customUrl && customUrl.trim().length > 0) {
      return customUrl.trim().replace(/\/$/, '');
    }
  } catch (e) {
    console.error('Failed to get custom API URL:', e);
  }
  return DEFAULT_API_URL;
}

export async function setBaseApiUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_API_URL, url.trim().replace(/\/$/, ''));
}

export async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getBaseApiUrl();
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = `Request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || errorJson.message || errorDetail;
      } catch (e) {
        // use default errorDetail
      }
      throw new Error(errorDetail);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`API Error on [${options.method || 'GET'} ${fullUrl}]:`, error.message);
    throw error;
  }
}

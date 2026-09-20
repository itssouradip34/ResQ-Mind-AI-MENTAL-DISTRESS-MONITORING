import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Default backend API URL
// Auto-detects local host IP from Metro bundler script URL when running in Expo Go
export function getAutoDetectedHost(): string {
  try {
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
    if (scriptURL && typeof scriptURL === 'string') {
      const match = scriptURL.match(/:\/\/([^:\/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:8000`;
      }
    }
  } catch (e) {
    // ignore
  }
  return 'http://172.24.29.95:8000';
}

export const DEFAULT_API_URL = Platform.select({
  android: getAutoDetectedHost(),
  ios: getAutoDetectedHost(),
  default: 'http://172.24.29.95:8000',
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
  return getAutoDetectedHost();
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

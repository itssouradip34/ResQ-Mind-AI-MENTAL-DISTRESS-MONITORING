const API_BASE = "http://localhost:8000";

export interface UserToken {
  access_token: string;
  token_type: string;
  role: string;
  user_id: string;
  name: string;
  district_id?: string;
  state_id?: string;
}

export const getStoredToken = (): string | null => {
  return localStorage.getItem("resq_token");
};

export const setStoredToken = (token: string) => {
  localStorage.setItem("resq_token", token);
};

export const getStoredUser = (): UserToken | null => {
  const u = localStorage.getItem("resq_user");
  return u ? JSON.parse(u) : null;
};

export const setStoredUser = (user: UserToken) => {
  localStorage.setItem("resq_user", JSON.stringify(user));
};

export const clearStoredAuth = () => {
  localStorage.removeItem("resq_token");
  localStorage.removeItem("resq_user");
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorDetail = "API Request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

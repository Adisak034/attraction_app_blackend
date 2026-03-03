export type AuthSession = {
  user_id: number;
  user_name: string;
  role: string;
};

const AUTH_STORAGE_KEY = 'temple_auth_session';

export function getAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.user_id || !parsed?.user_name || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

const TOKEN_KEY = 'invernaderos.jwt';
const USER_KEY = 'invernaderos.user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(session) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session));
}

export function getSession() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

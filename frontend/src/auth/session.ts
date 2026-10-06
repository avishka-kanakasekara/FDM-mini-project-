const STORAGE_KEY = "bankreach.session.v1";

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearSessionToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

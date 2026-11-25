const KEYS = {
  serviceRequests: 'ticketing.serviceRequests.v1',
  borrowSlips: 'ticketing.borrowSlips.v1',
} as const;

export function loadCollection<T>(key: string, seed: T[]): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : seed;
  } catch {
    return seed;
  }
}

export function saveCollection<T>(key: string, value: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures; the UI continues with in-memory state.
  }
}

export const storageKeys = KEYS;

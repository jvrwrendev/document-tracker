import { API_BASE_URL } from '@/lib/apiConfig';

export interface ApiErrorCtor {
  new (status: number, message: string, details?: unknown): Error;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = document.cookie
    .split('; ')
    .find(c => c.startsWith(`${name}=`))
    ?.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : undefined;
}

const CSRF_COOKIE = 'dms_csrf';
const CSRF_HEADER = 'x-xsrf-token';
const REFRESH_PATH = '/auth/refresh';

const NO_RETRY_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/logout',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/change-password',
  '/auth/first-login-change-password',
]);

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function buildRequestInit(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const csrfToken = readCookie(CSRF_COOKIE);
  if (csrfToken) headers.set(CSRF_HEADER, csrfToken);
  return { ...init, headers, credentials: 'include' };
}

export interface ApiFetchOptions {
  ErrorClass?: ApiErrorCtor;
  source?: string;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options: ApiFetchOptions = {},
): Promise<T> {
  const ErrorClass = options.ErrorClass ?? ApiError;
  const source = options.source;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, buildRequestInit(init));
  } catch {
    throw new ErrorClass(0, 'Network error — please retry.');
  }

  if (response.status === 401 && !NO_RETRY_PATHS.has(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      try {
        response = await fetch(`${API_BASE_URL}${path}`, buildRequestInit(init));
      } catch {
        throw new ErrorClass(0, 'Network error — please retry.');
      }
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let details: unknown;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (body.message) message = body.message;
      details = body;
    } catch {
      details = undefined;
    }
    if (response.status === 429) {
      message = 'Too many requests — please slow down and retry in a moment.';
    }
    if (import.meta.env.DEV && source) {
      // eslint-disable-next-line no-console
      console.warn(`[${source}] ${init.method ?? 'GET'} ${path} → ${response.status}`, message);
    }
    throw new ErrorClass(response.status, message, details);
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  return (
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload
  ) as T;
}
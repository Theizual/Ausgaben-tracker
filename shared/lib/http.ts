import { withRetry } from './retry';

export class HttpError extends Error {
  status: number;
  body: any;

  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export async function parseResponse(res: Response) {
  const ct = res.headers.get('content-type') ?? '';
  let body: any = null;

  try {
    if (ct.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }
  } catch {
    body = 'Failed to parse response body';
  }

  if (!res.ok) {
    const message =
      (body && (body.message || body.error || body.detail)) ||
      (typeof body === 'string' && body.length < 200 ? body : `HTTP Error ${res.status}`) ||
      `HTTP Error ${res.status}`;
    throw new HttpError(message, res.status, body);
  }
  return body;
}

const fetchWithTimeout = (url: RequestInfo, options: RequestInit = {}, timeout = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(id);
  });
};

export async function apiGet(url: string, init?: RequestInit) {
  return withRetry(async () => {
    const res = await fetchWithTimeout(url, { ...init, method: 'GET' });
    return parseResponse(res);
  });
}

export async function apiPost(url: string, body: any, init?: RequestInit) {
  return withRetry(async () => {
    const res = await fetchWithTimeout(url, {
      ...init,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      body: JSON.stringify(body),
    });
    return parseResponse(res);
  });
}

// --- bleibt wie bei dir ---
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

// --- NEU: kleine Helfer, die wir unten nutzen ---
type IdObj = { id: string };
export function byId<T extends IdObj>(arr: T[] | null | undefined, id?: string | null): T | null {
  if (!arr || !id) return null;
  return arr.find(x => x?.id === id) ?? null;
}
export function pickExisting<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter((x): x is T => !!x);
}
function asBool(x: any, def = false) {
  if (typeof x === 'boolean') return x;
  const s = String(x).toUpperCase();
  if (s === 'TRUE') return true;
  if (s === 'FALSE') return false;
  return def;
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

// --- NEU: webe die Retry-Logik ein ---
import { withRetry } from './retry';

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

/* ============================
   Laden + Normalisieren + Enrichment
   ============================ */

type ApiResponse = {
  categories: any[];
  transactions: any[];
  recurring: any[];
  tags: any[];
  users: any[];
  userSettings: any[];
};

function normalizeApi(resp: ApiResponse): ApiResponse {
  const norm = <T>(xs?: T[]) => Array.isArray(xs) ? xs : [];

  const categories = norm(resp.categories).map(c => ({
    ...c,
    isDeleted: asBool(c?.isDeleted, false),
    version: Number(c?.version) || 0,
  }));

  const tags = norm(resp.tags).map(t => ({
    ...t,
    isDeleted: asBool(t?.isDeleted, false),
    version: Number(t?.version) || 0,
  }));

  const users = norm(resp.users).map(u => ({
    ...u,
    isDeleted: asBool(u?.isDeleted, false),
    version: Number(u?.version) || 0,
  }));

  const recurring = norm(resp.recurring).map(r => ({
    ...r,
    isDeleted: asBool(r?.isDeleted, false),
    active: asBool(r?.active, true),
    version: Number(r?.version) || 0,
  }));

  const transactions = norm(resp.transactions).map(tx => {
    const tagIds = Array.isArray(tx?.tagIds)
      ? tx.tagIds
      : (typeof tx?.tagIds === 'string'
          ? tx.tagIds.split(',').map((t: string) => t.trim()).filter(Boolean)
          : []);

    return {
      ...tx,
      tagIds,
      isDeleted: asBool(tx?.isDeleted, false),
      version: Number(tx?.version) || 0,
      createdBy: tx?.createdBy ?? tx?.userId ?? '',
    };
  });

  const userSettings = norm(resp.userSettings).map(s => ({
    ...s,
    key: s?.key ?? s?.settingKey ?? '',
    value: s?.value ?? s?.settingValue ?? '',
    version: Number(s?.version) || 0,
  }));

  return { categories, tags, users, recurring, transactions, userSettings };
}

function enrich(resp: ApiResponse) {
  const { categories, tags, users, transactions } = resp;

  const txEnriched = transactions.map(tx => {
    const category = byId(categories, tx.categoryId);
    const user = byId(users, tx.createdBy);
    const fullTags = pickExisting((tx.tagIds ?? []).map((id: string) => byId(tags, id)));

    return {
      ...tx,
      category,                // kann null sein → UI prüft mit Null-Check
      user,
      tags: fullTags,          // ohne nulls
      hasActiveCategory: !!(category && category.isDeleted !== true),
      activeTags: fullTags.filter(t => t.isDeleted !== true),
    };
  });

  return { ...resp, transactions: txEnriched };
}

// Bequemer Loader, der gleich alles aufbereitet zurückgibt:
export async function loadAll(): Promise<ReturnType<typeof enrich>> {
  const raw = await apiGet('/api/sheets/read');
  const normalized = normalizeApi(raw as ApiResponse);
  return enrich(normalized);
}

type UnknownRecord = Record<string, unknown>;

type ResponseLike = {
  data: unknown;
  status?: number;
  config?: { url?: string; baseURL?: string; params?: unknown };
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const uniqueKeys = (aliases: string[]) =>
  Array.from(new Set(['data', ...aliases, 'items', 'results']));

/**
 * Accepts both plain arrays and common Laravel/API envelope shapes, including
 * paginated responses such as { data: { data: [...] } }.
 */
export function normalizeList<T>(payload: unknown, aliases: string[] = []): T[] {
  const queue: unknown[] = [payload];
  const seen = new Set<unknown>();
  const keys = uniqueKeys(aliases);

  while (queue.length) {
    const current = queue.shift();
    if (Array.isArray(current)) return current as T[];
    if (!isRecord(current) || seen.has(current)) continue;
    seen.add(current);

    for (const key of keys) {
      if (!(key in current)) continue;
      const value = current[key];
      if (Array.isArray(value)) return value as T[];
      if (isRecord(value)) queue.push(value);
    }
  }

  return [];
}

/**
 * Extracts a single resource from root, { data: resource }, nested
 * { data: { data: resource } }, or named envelopes such as { user: ... }.
 * When aliases are supplied but the backend uses only the standard Laravel
 * `data` envelope, the deepest data object is returned as a safe fallback.
 */
export function normalizeResource<T>(payload: unknown, aliases: string[] = []): T {
  if (!isRecord(payload)) return payload as T;

  const queue: UnknownRecord[] = [payload];
  const seen = new Set<UnknownRecord>();
  let dataFallback: UnknownRecord | undefined;

  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);

    for (const alias of aliases) {
      const value = current[alias];
      if (isRecord(value)) return value as T;
    }

    const data = current.data;
    if (isRecord(data)) {
      dataFallback = data;
      if (!aliases.length) {
        let deepest = data;
        while (isRecord(deepest.data)) deepest = deepest.data;
        return deepest as T;
      }
      queue.push(data);
    }
  }

  return (dataFallback ?? payload) as T;
}

/** Development-only diagnostics for the exact URL/status/payload behind an
 * unexpected empty list. Authorization headers are intentionally never logged.
 */
export function debugEmptyList(label: string, response: ResponseLike, list: unknown[]) {
  if (!__DEV__ || list.length) return;
  const url = `${response.config?.baseURL ?? ''}${response.config?.url ?? ''}`;
  console.warn(`[Vizit API] empty ${label}`, {
    url,
    status: response.status,
    params: response.config?.params,
    response: response.data,
  });
}

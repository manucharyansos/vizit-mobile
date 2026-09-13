import { create } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { appQueryClient } from '@/services/query-client';
import { isSessionDataQuery, sessionQueryKey } from '@/services/session-cache';

export const API_BASE_URL = 'https://api.vizit.am/api';
export const PUBLIC_WEB_URL = 'https://vizit.am';
export type TokenAudience = 'client' | 'business';
const keys: Record<TokenAudience, string> = { client: 'vizit.auth.client.v1', business: 'vizit.auth.business.v1' };
const lastAudienceKey = 'vizit.auth.last-audience.v1';
const writes: Record<TokenAudience, Promise<unknown>> = { client: Promise.resolve(), business: Promise.resolve() };
function sessionWrite<T>(audience: TokenAudience, action: () => Promise<T>): Promise<T> {
  const next = writes[audience].then(action, action);
  writes[audience] = next.catch(() => undefined);
  return next;
}

async function publishSessionState(audience: TokenAudience, present: boolean) {
  const queryKey = sessionQueryKey(audience);
  // An older keychain read must not restore a session after logout or a 401.
  // This cancels only the local storage query, never the rejecting HTTP query.
  await appQueryClient.cancelQueries({ queryKey, exact: true });
  appQueryClient.setQueryData(queryKey, present);
}

export const tokenStore = {
  get: (audience: TokenAudience) => SecureStore.getItemAsync(keys[audience]),
  async lastAudience(): Promise<TokenAudience | null> {
    const last = await SecureStore.getItemAsync(lastAudienceKey);
    if ((last === 'business' || last === 'client') && await SecureStore.getItemAsync(keys[last])) return last;
    // Migrate sessions created before the last-used workspace was persisted.
    if (!last && await SecureStore.getItemAsync(keys.business)) return 'business';
    if (!last && await SecureStore.getItemAsync(keys.client)) return 'client';
    return null;
  },
  async set(audience: TokenAudience, token: string) {
    return sessionWrite(audience, async () => {
      const predicate = (query: { queryKey: readonly unknown[] }) => isSessionDataQuery(query.queryKey, audience);
      await appQueryClient.cancelQueries({ predicate });
      await SecureStore.setItemAsync(keys[audience], token);
      await SecureStore.setItemAsync(lastAudienceKey, audience);
      appQueryClient.removeQueries({ predicate });
      await publishSessionState(audience, true);
    });
  },
  async remove(audience: TokenAudience, clearCache = true) {
    return sessionWrite(audience, async () => {
      await SecureStore.deleteItemAsync(keys[audience]);
      await publishSessionState(audience, false);
      if (clearCache) {
        const predicate = (query: { queryKey: readonly unknown[] }) => isSessionDataQuery(query.queryKey, audience);
        await appQueryClient.cancelQueries({ predicate });
        appQueryClient.removeQueries({ predicate });
      }
    });
  },
  async removeRejectedToken(audience: TokenAudience, authorization: unknown) {
    return sessionWrite(audience, async () => {
      const current = await SecureStore.getItemAsync(keys[audience]);
      if (!current || authorization !== `Bearer ${current}`) return;
      await SecureStore.deleteItemAsync(keys[audience]);
      await publishSessionState(audience, false);
    });
  },
};

export function createApiClient(audience?: TokenAudience) {
  const client = create({ baseURL: API_BASE_URL, timeout: 15_000, headers: { Accept: 'application/json' } });
  client.interceptors.request.use(async (config) => {
    if (audience) {
      const token = await tokenStore.get(audience);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Mobile-Client'] = 'vizit-mobile';
    return config;
  });
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Do not clear HTTP queries from inside the response interceptor. Clearing the
      // query that is currently rejecting can recreate it immediately and cause an
      // endless loading loop on auth screens. Explicit login/logout still clears cache.
      // A late 401 from an old request must never sign out a newly logged-in user.
      const credentialRequest = /\/auth\/(?:login|register|forgot-password|reset-password)\/?$/.test(error.config?.url ?? '');
      if (audience && error?.response?.status === 401 && !credentialRequest) {
        await tokenStore.removeRejectedToken(audience, error.config?.headers?.Authorization);
      }
      return Promise.reject(error);
    },
  );
  return client;
}

export const publicClient = createApiClient();
export const clientAuthClient = createApiClient('client');
export const businessAuthClient = createApiClient('business');

export function apiErrorMessage(error: unknown): string {
  const candidate = error as { response?: { data?: { message?: unknown; errors?: Record<string, unknown> } } };
  const data = candidate.response?.data;
  if (typeof data?.message === 'string') return data.message;
  const first = data?.errors && Object.values(data.errors).flat().find((value) => typeof value === 'string');
  return typeof first === 'string' ? first : 'Please try again.';
}

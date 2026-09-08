import { create } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { appQueryClient } from '@/services/query-client';

export const API_BASE_URL = 'https://api.vizit.am/api';
export const PUBLIC_WEB_URL = 'https://vizit.am';
export type TokenAudience = 'client' | 'business';
const keys: Record<TokenAudience, string> = { client: 'vizit.auth.client.v1', business: 'vizit.auth.business.v1' };

export const tokenStore = {
  get: (audience: TokenAudience) => SecureStore.getItemAsync(keys[audience]),
  async set(audience: TokenAudience, token: string) {
    appQueryClient.clear();
    await SecureStore.setItemAsync(keys[audience], token);
  },
  async remove(audience: TokenAudience) {
    appQueryClient.clear();
    await SecureStore.deleteItemAsync(keys[audience]);
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
      if (audience && error?.response?.status === 401) await tokenStore.remove(audience);
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

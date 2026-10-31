import { create } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './client';

/** Super admin accounts live apart from business and client accounts, with their own token. */
const ADMIN_TOKEN_KEY = 'vizit.auth.admin.v1';

// Falls back to memory where the keychain is unavailable (e.g. the web preview).
let memoryToken: string | null = null;
export const adminTokenStore = {
  async get() { try { return await SecureStore.getItemAsync(ADMIN_TOKEN_KEY); } catch { return memoryToken; } },
  async set(token: string) { memoryToken = token; try { await SecureStore.setItemAsync(ADMIN_TOKEN_KEY, token); } catch { /* memory only */ } },
  async remove() { memoryToken = null; try { await SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY); } catch { /* memory only */ } },
};

const adminClient = create({ baseURL: API_BASE_URL, timeout: 20_000, headers: { Accept: 'application/json' } });
adminClient.interceptors.request.use(async (config) => {
  const token = await adminTokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Mobile-Client'] = 'vizit-mobile';
  return config;
});
adminClient.interceptors.response.use((response) => response, async (error) => {
  if (error?.response?.status === 401 && !String(error.config?.url ?? '').endsWith('/admin/login')) await adminTokenStore.remove();
  return Promise.reject(error);
});

export type AdminProfile = { id: number; name: string; email: string; role: string };
export type AdminDashboard = {
  businesses: { total: number; active: number; suspended: number; new: number };
  users: { total: number; owners: number; new: number };
  bookings: { period_total: number; today: number };
  revenue: { period_total: number; today: number; all_time_total: number };
  subscriptions: { active: number; trialing: number; mrr: number; expiring_trials_7d: number; renewals_due_30d: number };
  date_range?: { start: string; end: string };
};
export type AdminBusinessRow = {
  id: number; name: string; slug: string; status: string; vertical?: string | null; business_type?: string; created_at: string;
  bookings_count?: number; users_count?: number;
  owner_summary?: { name: string; email?: string | null; phone?: string | null } | null;
  subscription_summary?: { status: string; trial_ends_at?: string | null; current_period_ends_at?: string | null; plan?: { name: string; code: string } | null } | null;
};
export type AdminBusinessDetail = {
  business: { id: number; name: string; slug: string; status: string; vertical?: string; phone?: string | null; address?: string | null; created_at?: string; billing_status?: string };
  subscription: null | { status: string; billing_cycle?: string; trial_ends_at?: string | null; current_period_ends_at?: string | null; plan?: { name: string; code: string; monthly_price?: number } | null; pricing?: { effective_monthly_price?: number } };
  seats?: { active: number; limit: number };
  stats?: { users_total?: number; staff_active?: number; bookings_total?: number; revenue_all_time?: number };
  team?: { id: number; name: string; email?: string | null; role: string; is_active: boolean }[];
  pricing_overrides?: { id: number; plan?: { name: string } | null; effective_monthly_price?: number | null; state?: string; starts_at?: string | null; ends_at?: string | null }[];
  billing?: { paid_total: number; pending_total: number; invoices: { id: number; status: string; amount: number; created_at?: string }[] };
};

export const adminApi = {
  async login(email: string, password: string): Promise<AdminProfile> {
    const { data } = await adminClient.post('/admin/login', { email, password });
    const token = data?.data?.token;
    if (typeof token !== 'string' || !token) throw new Error('No token');
    await adminTokenStore.set(token);
    return data.data.admin as AdminProfile;
  },
  me: async (): Promise<AdminProfile> => (await adminClient.get('/admin/me')).data.data.admin,
  async logout() {
    try { await adminClient.post('/admin/logout'); } catch { /* The local token is removed anyway. */ }
    await adminTokenStore.remove();
  },
  dashboard: async (period = '30_days'): Promise<AdminDashboard> => (await adminClient.get('/admin/analytics/dashboard', { params: { period } })).data.data,
  businesses: async (params: { search?: string; page?: number }): Promise<{ data: AdminBusinessRow[]; current_page: number; last_page: number; total: number }> =>
    (await adminClient.get('/admin/businesses', { params: { ...params, per_page: 30 } })).data.data,
  business: async (id: number): Promise<AdminBusinessDetail> => (await adminClient.get(`/admin/businesses/${id}`)).data.data,
  suspend: async (id: number) => (await adminClient.post(`/admin/businesses/${id}/suspend`)).data,
  restore: async (id: number) => (await adminClient.post(`/admin/businesses/${id}/restore`)).data,
};

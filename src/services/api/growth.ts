import { businessAuthClient } from './client';
import { debugEmptyList, normalizeList, normalizeResource } from './normalize';

export type WaitlistStatus = 'waiting' | 'offered' | 'booked' | 'cancelled' | 'expired';
export type WaitlistEntry = {
  id: number;
  service_id: number;
  staff_id: number | null;
  location_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  desired_date: string;
  window_start: string | null;
  window_end: string | null;
  party_size: number;
  status: WaitlistStatus;
  offered_starts_at: string | null;
  offered_ends_at: string | null;
  offer_expires_at: string | null;
  notes: string | null;
  service: { id: number; name: string; booking_mode?: 'individual' | 'group'; capacity?: number } | null;
  staff: { id: number; name: string } | null;
  offered_staff?: { id: number; name: string } | null;
};

export type AvailabilitySlot = { starts_at: string; ends_at: string; staff_id: number; staff_name?: string; is_recommended?: boolean };
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
export type CampaignSegment = 'all' | 'new' | 'returning' | 'inactive' | 'vip';
export type MarketingCampaign = {
  id: number;
  name: string;
  channel: 'email';
  segment: CampaignSegment;
  subject: string;
  body: string;
  status: CampaignStatus;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  deliveries_count?: number;
  created_at: string;
};
export type CampaignPayload = { name: string; segment: CampaignSegment; subject: string; body: string; scheduled_for?: string | null };
export type MarketingDelivery = { id: number; email: string; status: 'pending' | 'sent' | 'failed'; sent_at: string | null; error: string | null };

export const growthApi = {
  async waitlist(): Promise<WaitlistEntry[]> {
    const response = await businessAuthClient.get('/waitlist');
    const list = normalizeList<WaitlistEntry>(response.data, ['waitlist']);
    debugEmptyList('growth.waitlist', response, list);
    return list;
  },
  async updateWaitlist(id: number, status: 'waiting' | 'cancelled'): Promise<WaitlistEntry> {
    const { data } = await businessAuthClient.patch(`/waitlist/${id}`, { status });
    return normalizeResource<WaitlistEntry>(data, ['entry', 'waitlist']);
  },
  async availability(entry: WaitlistEntry): Promise<AvailabilitySlot[]> {
    const response = await businessAuthClient.get('/availability', {
      params: {
        service_id: entry.service_id,
        staff_id: entry.staff_id ?? undefined,
        location_id: entry.location_id ?? undefined,
        date: entry.desired_date,
        party_size: Math.max(1, entry.party_size || 1),
        _t: Date.now(),
      },
    });
    const list = normalizeList<AvailabilitySlot>(response.data, ['slots', 'availability']);
    debugEmptyList('growth.waitlistAvailability', response, list);
    return list;
  },
  async offerWaitlist(id: number, slot: AvailabilitySlot): Promise<WaitlistEntry> {
    const { data } = await businessAuthClient.post(`/waitlist/${id}/offer`, {
      staff_id: slot.staff_id,
      starts_at: slot.starts_at.slice(0, 16).replace('T', ' '),
    });
    return normalizeResource<WaitlistEntry>(data, ['entry', 'waitlist']);
  },
  async campaigns(): Promise<MarketingCampaign[]> {
    const response = await businessAuthClient.get('/marketing/campaigns');
    const list = normalizeList<MarketingCampaign>(response.data, ['campaigns']);
    debugEmptyList('growth.campaigns', response, list);
    return list;
  },
  async createCampaign(payload: CampaignPayload): Promise<MarketingCampaign> {
    const { data } = await businessAuthClient.post('/marketing/campaigns', payload);
    return normalizeResource<MarketingCampaign>(data, ['campaign']);
  },
  async updateCampaign(id: number, payload: CampaignPayload): Promise<MarketingCampaign> {
    const { data } = await businessAuthClient.put(`/marketing/campaigns/${id}`, payload);
    return normalizeResource<MarketingCampaign>(data, ['campaign']);
  },
  async sendCampaign(id: number): Promise<MarketingCampaign> {
    const { data } = await businessAuthClient.post(`/marketing/campaigns/${id}/send`);
    return normalizeResource<MarketingCampaign>(data, ['campaign']);
  },
  async cancelCampaign(id: number): Promise<MarketingCampaign> {
    const { data } = await businessAuthClient.post(`/marketing/campaigns/${id}/cancel`);
    return normalizeResource<MarketingCampaign>(data, ['campaign']);
  },
  async deliveries(id: number): Promise<MarketingDelivery[]> {
    const response = await businessAuthClient.get(`/marketing/campaigns/${id}/deliveries`);
    const list = normalizeList<MarketingDelivery>(response.data, ['deliveries']);
    debugEmptyList('growth.campaignDeliveries', response, list);
    return list;
  },
};

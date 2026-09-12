import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

export type PaymentReturn = { status: 'processing' | 'success' | 'failed' | 'cancelled'; reference?: string; invoiceId?: string };

export function paymentIdFrom(payload: Record<string, unknown>): string | null {
  const data = payload.data as Record<string, unknown> | undefined;
  const value = String(payload.invoice_id ?? payload.payment_id ?? data?.invoice_id ?? data?.payment_id ?? '');
  return /^\d+$/.test(value) ? value : null;
}

export function checkoutUrlFrom(payload: Record<string, unknown>): string | null {
  const data = payload.data as Record<string, unknown> | undefined;
  const value = payload.payment_url ?? payload.checkout_url ?? data?.payment_url ?? data?.checkout_url;
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : null; } catch { return null; }
}

export async function openIdBankCheckout(checkoutUrl: string) {
  const returnUrl = Linking.createURL('/payment-return');
  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl, { preferEphemeralSession: true });
  if (result.type === 'success') {
    const payment = parsePaymentReturn(result.url);
    router.replace({ pathname: '/payment-return', params: payment.invoiceId ? { invoice_id: payment.invoiceId } : {} });
  }
  return result;
}

export function parsePaymentReturn(url: string): PaymentReturn {
  const parsed = Linking.parse(url); const query = parsed.queryParams ?? {};
  const raw = String(query.status ?? 'processing');
  const status: PaymentReturn['status'] = raw === 'success' || raw === 'failed' || raw === 'cancelled' ? raw : 'processing';
  return { status, reference: query.reference ? String(query.reference) : undefined, invoiceId: query.invoice_id ? String(query.invoice_id) : undefined };
}

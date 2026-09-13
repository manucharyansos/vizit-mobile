const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
const { QueryClient, QueryObserver, MutationObserver, onlineManager } = require('@tanstack/react-query');
const root = path.resolve(__dirname, '..');

// Run the actual TypeScript services with an in-memory native keychain.
// No API requests, real credentials, booking mutations or native runtime needed.
function harness(overrides = {}) {
  const values = new Map();
  const secure = {
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => { values.set(key, value); },
    deleteItemAsync: async (key) => { values.delete(key); },
  };
  const cache = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  const mocks = { 'expo-secure-store': secure, '@/services/query-client': { appQueryClient: cache }, ...overrides };
  const modules = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const requireFrom = createRequire(filename);
    const resolve = (name) => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('@/') || name.startsWith('.')) {
        let local = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(filename), name);
        if (!path.extname(local)) local += '.ts';
        return load(local);
      }
      return requireFrom(name);
    };
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    new Function('require', 'module', 'exports', '__DEV__', compiled)(resolve, module, module.exports, false);
    return module.exports;
  }
  return { values, secure, cache, load };
}

test('guest history retains all bookings across relaunch, including a legacy last booking', async () => {
  const app = harness();
  app.values.set('vizit.guest-booking.last-code.v1', 'LEGACY-REFERENCE');
  const store = app.load('src/services/guest-booking-store.ts').guestBookingStore;
  await Promise.all(Array.from({ length: 47 }, (_, id) => store.rememberGuestBooking(`REF-${id}`, { businessName: `Business ${id}` })));
  const history = await store.listGuestBookings();
  assert.equal(history.length, 48);
  assert.equal(new Set(history.map((item) => item.code)).size, 48);
  assert.equal(history[0].summary.businessName, 'Business 46');
  assert.ok(history.some((item) => item.code === 'LEGACY-REFERENCE'));
  assert.equal(app.values.get('vizit.guest-booking.index.v2'), '3');
});

test('guest expiry and account logout preserve independently saved guest bookings', async () => {
  const app = harness(); const store = app.load('src/services/guest-booking-store.ts').guestBookingStore;
  await store.rememberGuestBooking('GUEST', { businessName: 'Guest visit' });
  await store.save('GUEST', 'guest-access');
  await store.rememberClientBookingReferences([{ bookingId: 1, code: 'ACCOUNT' }, { bookingId: 2, code: 'GUEST' }]);
  await store.save('ACCOUNT', 'account-access');
  await store.clearClientBookingReferences();
  assert.equal(await store.restore('ACCOUNT'), null);
  assert.equal((await store.restore('GUEST')).token, 'guest-access');
  await store.clearSession('GUEST');
  assert.equal((await store.listGuestBookings()).length, 1);
  assert.equal(await store.restore('GUEST'), null);
});

test('opening another booking and returning from payment use the exact saved booking', async () => {
  const { load } = harness(); const store = load('src/services/guest-booking-store.ts').guestBookingStore;
  await store.rememberGuestBooking('FIRST', { startsAt: '2026-09-14 10:00:00' });
  await store.save('FIRST', 'token-first'); await store.rememberPayment('42', 'FIRST');
  await store.rememberGuestBooking('SECOND', {}); await store.save('SECOND', 'token-second');
  assert.equal((await store.restorePayment('42')).code, 'FIRST');
  assert.equal(await store.restorePayment('../42'), null);
  assert.equal(await store.consumeRequestedCode(), 'SECOND');
  assert.equal(await store.consumeRequestedCode(), null);
  await store.clear('FIRST');
  assert.equal(await store.restoreLastCode(), 'SECOND');
  assert.equal((await store.listGuestBookings()).length, 1);
});

test('legacy account references are not migrated into guest history', async () => {
  const { load } = harness(); const store = load('src/services/guest-booking-store.ts').guestBookingStore;
  await store.rememberClientBookingReferences([{ bookingId: 4, code: 'ACCOUNT-ONLY' }]);
  await store.rememberCode('ACCOUNT-ONLY');
  assert.deepEqual(await store.listGuestBookings(), []);
});

test('group booking keeps all visits, shared business and authoritative action flags, without references', () => {
  const { load } = harness(); const { normalizeGuestBooking, guestSummary } = load('src/services/guest-booking.ts');
  const normalized = normalizeGuestBooking({ data: { booking_code: 'PRIVATE-REFERENCE', guest_token: 'SECRET', business: { name: 'Studio', slug: 'studio' }, client_name: 'Client', telegram_connected: true, can_cancel: false, status: 'confirmed', bookings: [{ id: 10, starts_at: '2026-10-01T06:00:00Z', service: { name: 'First' }, can_reschedule: true, booking_code: 'PRIVATE-REFERENCE' }, { id: 11, starts_at: '2026-10-01T07:00:00Z', service: { name: 'Second' }, can_reschedule: false }] } });
  assert.equal(normalized.bookings.length, 2); assert.equal(normalized.business.name, 'Studio');
  assert.equal(normalized.can_cancel, false); assert.equal(normalized.telegram_connected, true);
  assert.equal(normalized.bookings[1].can_reschedule, false);
  assert.equal(JSON.stringify(normalized).includes('PRIVATE-REFERENCE'), false);
  assert.equal(JSON.stringify(normalized).includes('SECRET'), false);
  assert.deepEqual(guestSummary(normalized).bookingIds, [10, 11]);
  assert.equal(normalizeGuestBooking(null).bookings.length, 0);
});

test('Armenian wall-clock timestamps and UTC instants have the same displayed time in every device zone', () => {
  const { load } = harness(); const time = load('src/services/date-time.ts');
  const previous = process.env.TZ;
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Yerevan']) {
      process.env.TZ = zone;
      assert.equal(time.apiDateToLocal('2026-10-01 10:30:00').toISOString(), '2026-10-01T06:30:00.000Z');
      assert.equal(time.localDateTimeInputFromApi('2026-10-01T06:30:00.000000Z'), '2026-10-01 10:30');
      assert.equal(time.formatApiTime('2026-10-01T06:30:00Z', 'ru'), '10:30');
      assert.equal(time.localDateKeyFromApi('2026-09-30T22:30:00Z'), '2026-10-01');
      assert.equal(time.formatApiDateTime('2026-10-01 10:30:00', 'hy'), time.formatApiDateTime('2026-10-01T06:30:00Z', 'hy'));
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('successful authentication removes auth history at the root for both audiences', () => {
  const { load } = harness(); const { signedInNavigationState } = load('src/services/auth-navigation.ts');
  for (const target of ['profile', 'today', 'admin']) {
    const state = signedInNavigationState(target);
    assert.equal(state.index, 0); assert.equal(state.routes.length, 1);
    assert.equal(state.routes[0].name, target === 'profile' ? '(customer)' : '(business)');
    assert.equal(state.routes[0].state.routes[0].name, target);
    assert.equal(JSON.stringify(state).includes('login'), false);
  }
});

test('client login/logout do not clear business session or calendar cache', async () => {
  const app = harness(); const { tokenStore } = app.load('src/services/api/client.ts');
  await tokenStore.set('business', 'business-secret');
  app.cache.setQueryData(['calendar', 'today'], [{ id: 3 }]); app.cache.setQueryData(['business-me'], { id: 8 });
  app.cache.setQueryData(['client-me'], { id: 99 });
  await tokenStore.set('client', 'client-secret');
  assert.deepEqual(app.cache.getQueryData(['calendar', 'today']), [{ id: 3 }]);
  assert.equal(app.cache.getQueryData(['client-me']), undefined);
  await tokenStore.remove('client');
  assert.equal(await tokenStore.get('business'), 'business-secret');
  assert.equal(app.cache.getQueryData(['business-me']).id, 8);
});

test('a late 401 cannot erase a replacement session, but current-token rejection expires its audience', async () => {
  const app = harness(); const { tokenStore } = app.load('src/services/api/client.ts');
  await tokenStore.set('business', 'old');
  await Promise.all([tokenStore.set('business', 'new'), tokenStore.removeRejectedToken('business', 'Bearer old')]);
  assert.equal(await tokenStore.get('business'), 'new');
  await tokenStore.set('client', 'client');
  await tokenStore.removeRejectedToken('business', 'Bearer new');
  assert.equal(await tokenStore.get('business'), null);
  assert.equal(await tokenStore.get('client'), 'client');
});

test('cold launch restores last authenticated workspace without a navigation guard', async () => {
  const app = harness(); const { tokenStore } = app.load('src/services/api/client.ts');
  app.values.set('vizit.auth.business.v1', 'legacy-business');
  assert.equal(await tokenStore.lastAudience(), 'business');
  await tokenStore.set('client', 'client'); assert.equal(await tokenStore.lastAudience(), 'client');
  await tokenStore.remove('client'); assert.equal(await tokenStore.lastAudience(), null);
});

test('incorrect login credentials do not revoke an already valid session', async () => {
  const app = harness(); const { tokenStore, businessAuthClient } = app.load('src/services/api/client.ts');
  await tokenStore.set('business', 'valid');
  const rejectRequest = async (config) => { throw { config, response: { status: 401 } }; };
  await assert.rejects(businessAuthClient.post('/auth/login', {}, { adapter: rejectRequest }));
  assert.equal(await tokenStore.get('business'), 'valid');
  await assert.rejects(businessAuthClient.get('/auth/me', { adapter: rejectRequest }));
  assert.equal(await tokenStore.get('business'), null);
});

test('client pagination loads every page and deduplicates rows', async () => {
  const { load } = harness(); const { collectPages } = load('src/services/api/pagination.ts');
  const requested = [];
  const rows = await collectPages(async (page) => { requested.push(page); return { data: page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 2 }, { id: 3 }], current_page: page, last_page: 2 }; });
  assert.deepEqual(requested, [1, 2]); assert.deepEqual(rows.map((row) => row.id), [1, 2, 3]);
  await assert.rejects(collectPages(async () => ({ data: [], last_page: 3 })), /Incomplete/);
});

test('permissions keep staff away from management and manager away from owner billing', () => {
  const { load } = harness(); const { businessPermissions } = load('src/services/business-permissions.ts');
  assert.equal(businessPermissions('staff').canManage, false);
  assert.equal(businessPermissions('manager').canManage, true);
  assert.equal(businessPermissions('manager').canBill, false);
  assert.equal(businessPermissions('owner').canBill, true);
  assert.equal(businessPermissions().canManage, false);
});

test('nearby geometry accepts zero coordinates, rejects invalid ones and builds origin/destination routes', () => {
  const { load } = harness(); const geo = load('src/services/geo.ts');
  assert.deepEqual(geo.validPoint(0, 0), { latitude: 0, longitude: 0 });
  for (const lat of [null, '', NaN, 91, -91]) assert.equal(geo.validPoint(lat, 44), null);
  const origin = { latitude: 40.1772, longitude: 44.50349 }; const close = { latitude: 40.18, longitude: 44.51 };
  assert.equal(geo.distanceKm(origin, origin), 0); assert.ok(geo.distanceKm(origin, close) < 1);
  const link = new URL(geo.directionsUrl(close, origin, 'walking'));
  assert.equal(link.searchParams.get('origin'), '40.1772,44.50349'); assert.equal(link.searchParams.get('travelmode'), 'walking');
  assert.equal(new URL(geo.directionsUrl(close)).searchParams.has('origin'), false);
  assert.equal(new URL(geo.yandexDirectionsUrl(close, origin)).searchParams.get('rtext'), '40.1772,44.50349~40.18,44.51');
});

test('text tokens meet 4.5:1 contrast on primary reading surfaces in both themes', () => {
  const { load } = harness(); const { themes } = load('src/constants/vizit-theme.ts');
  const luminance = (hex) => hex.slice(1).match(/../g).map((v) => parseInt(v, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  for (const [mode, theme] of Object.entries(themes)) {
    for (const foreground of ['text', 'textSecondary', 'muted', 'faint', 'accentText']) for (const background of ['background', 'surfaceRaised']) {
      const a = luminance(theme[foreground]); const b = luminance(theme[background]);
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${mode}: ${foreground}/${background}`);
    }
  }
});

test('sign-out selects the root login screen without leaving an authenticated tab in history', () => {
  const { load } = harness();
  const { authNavigationState } = load('src/services/auth-navigation.ts');
  assert.deepEqual(authNavigationState('login'), { index: 0, routes: [{ name: 'login' }] });
  assert.equal(authNavigationState('profile').routes[0].name, '(customer)');
  assert.equal(authNavigationState('today').routes[0].name, '(business)');
});

test('the legacy business login renders the unified form when signed out, with no self-redirect', () => {
  const UnifiedLogin = () => null;
  const app = harness({
    'expo-router': { Redirect: () => null },
    'react-native': { StyleSheet: { create: (styles) => styles } },
    'react-native-safe-area-context': { SafeAreaView: () => null },
    '@/providers/app-provider': { useApp: () => ({ theme: {} }) },
    '@/hooks/use-existing-business-session': { useExistingBusinessSession: () => ({ isLoading: false, data: false }) },
    '../login': { default: UnifiedLogin, __esModule: true },
  });
  assert.equal(app.load('src/app/(business)/login.tsx').default().type, UnifiedLogin);
});

test('both logout flows complete offline, navigate once, and preserve the other audience and guest history', { timeout: 5000 }, async () => {
  try {
    onlineManager.setOnline(false);
    for (const audience of ['client', 'business']) {
      const destinations = []; const revocations = [];
      const app = harness({
        '@tanstack/react-query': { useMutation: (options) => options },
        'react-native': { Alert: { alert: () => assert.fail('Logout should finish without an error alert') } },
        '@/providers/app-provider': { useApp: () => ({ t: (key) => key }) },
        './use-auth-navigation': { useAuthNavigation: () => (destination) => destinations.push(destination) },
        '../notifications': { revokePushDevice: async (value) => { revocations.push(value); throw new Error('Device revocation unavailable'); }, synchronizePushDevice: async () => false },
      });
      const { tokenStore, clientAuthClient, businessAuthClient } = app.load('src/services/api/client.ts');
      await tokenStore.set('client', 'client-session');
      await tokenStore.set('business', 'business-session');
      app.cache.setQueryData(['business-me'], { id: 7 });
      app.cache.setQueryData(['client-me'], { id: 9 });
      const store = app.load('src/services/guest-booking-store.ts').guestBookingStore;
      await store.rememberGuestBooking('GUEST', { businessName: 'Saved guest visit' });
      await store.save('GUEST', 'guest-access');
      await store.rememberClientBookingReferences([{ bookingId: 1, code: 'ACCOUNT' }]);
      await store.save('ACCOUNT', 'account-access');
      const rejectOffline = async (config) => { assert.ok(config.timeout <= 2000); throw new Error('Offline'); };
      clientAuthClient.defaults.adapter = rejectOffline;
      businessAuthClient.defaults.adapter = rejectOffline;
      const options = app.load('src/hooks/use-sign-out.ts').useSignOut(audience);
      const observer = new MutationObserver(app.cache, options);
      await observer.mutate();
      assert.equal(observer.getCurrentResult().isPaused, false);
      assert.deepEqual(destinations, ['login']);
      assert.deepEqual(revocations, [audience]);
      assert.equal(await tokenStore.get(audience), null);
      const other = audience === 'client' ? 'business' : 'client';
      assert.equal(await tokenStore.get(other), `${other}-session`);
      assert.ok(app.cache.getQueryData([`${other}-me`]));
      assert.equal((await store.listGuestBookings()).length, 1);
      assert.equal((await store.restore('GUEST')).token, 'guest-access');
      if (audience === 'client') assert.equal(await store.restore('ACCOUNT'), null);
    }
  } finally {
    onlineManager.setOnline(true);
  }
});

test('CRM visit summaries agree with calendar times instead of displaying raw UTC four hours early', async () => {
  const app = harness({ '../notifications': { revokePushDevice: async () => {}, synchronizePushDevice: async () => false } });
  const { businessAuthClient } = app.load('src/services/api/client.ts');
  const client = { id: 1, name: 'Client', next_booking_at: '2026-09-14 05:15:00', last_booking_at: '2026-09-13 06:00:00', recent_bookings: [{ id: 8, starts_at: '2026-09-14T09:15:00+04:00', ends_at: '2026-09-14T09:30:00+04:00', status: 'confirmed' }], recent_notes: [{ id: 1, body: 'A note', created_at: '2026-09-12 10:00:00' }] };
  businessAuthClient.defaults.adapter = async (config) => ({ data: config.url === '/clients' ? { data: [client], current_page: 1, last_page: 1 } : { data: client }, status: 200, statusText: 'OK', headers: {}, config });
  const { businessApi } = app.load('src/services/api/business.ts');
  const { formatApiTime, databaseUtcTimestamp } = app.load('src/services/date-time.ts');
  const detail = await businessApi.client(1); const list = await businessApi.clients();
  assert.equal(formatApiTime(detail.next_booking_at, 'hy'), '09:15');
  assert.equal(formatApiTime(list[0].next_booking_at, 'ru'), '09:15');
  assert.equal(formatApiTime(detail.next_booking_at, 'en'), formatApiTime(detail.recent_bookings[0].starts_at, 'en'));
  assert.equal(detail.recent_bookings[0].starts_at, client.recent_bookings[0].starts_at);
  assert.equal(formatApiTime(detail.recent_notes[0].created_at, 'hy'), '14:00');
  assert.equal(databaseUtcTimestamp('2026-09-14T09:15:00+04:00'), '2026-09-14T09:15:00+04:00');
  assert.equal(databaseUtcTimestamp(null), null);
});

test('mounted session observers follow logout and re-login without losing their query subscription', async () => {
  for (const audience of ['client', 'business']) {
    const app = harness();
    const { tokenStore } = app.load('src/services/api/client.ts');
    const { sessionQueryOptions } = app.load('src/services/session-query.ts');
    await tokenStore.set(audience, 'first-account');
    const observer = new QueryObserver(app.cache, sessionQueryOptions(audience));
    const unsubscribe = observer.subscribe(() => {});
    try {
      await observer.refetch();
      const sessionQuery = observer.getCurrentQuery();
      assert.equal(observer.getCurrentResult().data, true);
      app.cache.setQueryData([`${audience}-me`], { id: 1 });
      await tokenStore.remove(audience);
      assert.equal(observer.getCurrentResult().data, false);
      assert.equal(observer.getCurrentQuery(), sessionQuery);
      assert.equal(app.cache.getQueryData([`${audience}-me`]), undefined);
      await tokenStore.set(audience, 'second-account');
      assert.equal(observer.getCurrentResult().data, true);
      assert.equal(observer.getCurrentQuery(), sessionQuery);
    } finally { unsubscribe(); app.cache.clear(); }
  }
});

test('session checks read the keychain offline and recover from a storage read failure', { timeout: 5000 }, async () => {
  try {
    onlineManager.setOnline(false);
    for (const audience of ['client', 'business']) {
      const app = harness();
      app.values.set(`vizit.auth.${audience}.v1`, 'saved-session');
      const { sessionQueryOptions } = app.load('src/services/session-query.ts');
      const observer = new QueryObserver(app.cache, sessionQueryOptions(audience));
      const unsubscribe = observer.subscribe(() => {});
      try {
        assert.equal((await observer.refetch()).data, true);
        assert.equal(observer.getCurrentResult().isPaused, false);
        const read = app.secure.getItemAsync;
        app.secure.getItemAsync = async () => { throw new Error('Keychain temporarily unavailable'); };
        assert.equal((await observer.refetch()).isError, true);
        app.secure.getItemAsync = read;
        assert.equal((await observer.refetch()).isSuccess, true);
        assert.equal(observer.getCurrentResult().data, true);
      } finally { unsubscribe(); app.cache.clear(); }
    }
  } finally { onlineManager.setOnline(true); }
});

test('a protected 401 ends the visible business session without cancelling its query or the client account', async () => {
  const app = harness();
  const { tokenStore, businessAuthClient } = app.load('src/services/api/client.ts');
  const { sessionQueryOptions } = app.load('src/services/session-query.ts');
  await tokenStore.set('business', 'expired-business');
  await tokenStore.set('client', 'valid-client');
  app.cache.setQueryData(['client-me'], { id: 10 });
  const session = new QueryObserver(app.cache, sessionQueryOptions('business'));
  const unsubscribe = session.subscribe(() => {});
  const rejectRequest = async (config) => { throw { config, response: { status: 401, data: { message: 'Unauthenticated.' } } }; };
  try {
    await session.refetch();
    await assert.rejects(app.cache.fetchQuery({ queryKey: ['business-clients'], queryFn: () => businessAuthClient.get('/clients', { adapter: rejectRequest }) }));
    assert.equal(session.getCurrentResult().data, false);
    assert.equal(app.cache.getQueryState(['business-clients']).status, 'error');
    assert.equal(app.cache.getQueryState(['business-clients']).fetchStatus, 'idle');
    assert.equal(await tokenStore.get('business'), null);
    assert.equal(await tokenStore.get('client'), 'valid-client');
    assert.deepEqual(app.cache.getQueryData(['client-me']), { id: 10 });
    await tokenStore.set('business', 'new-business');
    assert.equal(session.getCurrentResult().data, true);
    assert.equal(app.cache.getQueryState(['business-clients']), undefined);
  } finally { unsubscribe(); app.cache.clear(); }
});

test('an in-flight keychain read cannot resurrect a rejected session', async () => {
  const app = harness();
  const { tokenStore, businessAuthClient } = app.load('src/services/api/client.ts');
  const { sessionQueryOptions } = app.load('src/services/session-query.ts');
  await tokenStore.set('business', 'old-business');
  const read = app.secure.getItemAsync;
  let release; let delayNextRead = true;
  app.secure.getItemAsync = (key) => {
    if (key === 'vizit.auth.business.v1' && delayNextRead) {
      delayNextRead = false;
      const captured = app.values.get(key);
      return new Promise((resolve) => { release = () => resolve(captured); });
    }
    return read(key);
  };
  const observer = new QueryObserver(app.cache, sessionQueryOptions('business'));
  const unsubscribe = observer.subscribe(() => {});
  try {
    assert.equal(typeof release, 'function');
    await assert.rejects(businessAuthClient.get('/auth/me', { adapter: async (config) => { throw { config, response: { status: 401 } }; } }));
    assert.equal(observer.getCurrentResult().data, false);
    release();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(observer.getCurrentResult().data, false);
    assert.equal(observer.getCurrentResult().fetchStatus, 'idle');
    assert.equal(await tokenStore.get('business'), null);
  } finally { release?.(); unsubscribe(); app.cache.clear(); }
});

test('network failures and role denials preserve an otherwise valid business session', async () => {
  const app = harness(); const { tokenStore, businessAuthClient } = app.load('src/services/api/client.ts');
  await tokenStore.set('business', 'valid');
  for (const response of [undefined, { status: 403 }, { status: 500 }]) {
    await assert.rejects(businessAuthClient.get('/clients', { adapter: async (config) => { throw { config, response }; } }));
    assert.equal(await tokenStore.get('business'), 'valid');
    assert.equal(app.cache.getQueryData(['business-existing-session']), true);
  }
});

function elementTree(element) {
  if (Array.isArray(element)) return element.flatMap(elementTree);
  if (!element || typeof element !== 'object' || !element.props) return [];
  return [element, ...elementTree(element.props.children), ...elementTree(element.props.action)];
}

test('business recovery hides protected tabs, keeps auth routes open, and navigates only on an explicit action', () => {
  let segments = ['(business)', 'clients']; let retries = 0;
  let session = { isPending: false, isError: false, data: true, refetch: () => { retries += 1; } };
  const destinations = [];
  const app = harness({
    'expo-router': { useSegments: () => segments },
    'react-native': { StyleSheet: { create: (styles) => styles }, ActivityIndicator: 'ActivityIndicator', ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/premium-ui': { BrandLockup: 'BrandLockup', PremiumButton: 'PremiumButton', StateCard: 'StateCard' },
    '@/providers/app-provider': { useApp: () => ({ locale: 'ru', theme: {} }) },
    '@/hooks/use-existing-business-session': { useExistingBusinessSession: () => session },
    '@/hooks/use-auth-navigation': { useAuthNavigation: () => (destination) => destinations.push(destination) },
  });
  const { BusinessSessionBoundary } = app.load('src/components/business-session-boundary.tsx');
  const protectedTabs = { type: 'Tabs', props: {} };
  const render = () => BusinessSessionBoundary({ children: protectedTabs });
  assert.equal(render(), protectedTabs);
  session = { ...session, data: false };
  const recovery = elementTree(render());
  assert.ok(!recovery.includes(protectedTabs));
  assert.deepEqual(destinations, []);
  recovery.find((node) => node.type === 'PremiumButton' && node.props.title === 'Войти').props.onPress();
  recovery.find((node) => node.type === 'PremiumButton' && node.props.tone === 'ghost').props.onPress();
  assert.deepEqual(destinations, ['login', 'discover']);
  const { authNavigationState } = app.load('src/services/auth-navigation.ts');
  assert.deepEqual(authNavigationState('discover'), { index: 0, routes: [{ name: '(customer)', state: { index: 0, routes: [{ name: 'discover' }] } }] });
  for (const route of ['login', 'register']) { segments = ['(business)', route]; assert.equal(render(), protectedTabs); }
  segments = ['(business)', 'today'];
  session = { ...session, data: undefined, isPending: true };
  assert.ok(elementTree(render()).some((node) => node.type === 'ActivityIndicator'));
  assert.ok(!elementTree(render()).includes(protectedTabs));
  session = { ...session, data: true, isPending: false, isError: true };
  const storageError = elementTree(render());
  assert.ok(!storageError.includes(protectedTabs));
  storageError.find((node) => node.type === 'PremiumButton' && node.props.title === 'Повторить').props.onPress();
  assert.equal(retries, 1);
  assert.deepEqual(destinations, ['login', 'discover']);
});

test('More shows profile recovery instead of a partial staff menu, and retains owner/manager/staff access', () => {
  let permissions; let retries = 0;
  const app = harness({
    'expo-router': { router: { push: () => {} } },
    'react-native': { StyleSheet: { create: (styles) => styles }, ActivityIndicator: 'ActivityIndicator', ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/premium-ui': Object.fromEntries(['Divider', 'PageHeader', 'PreferenceBar', 'PremiumButton', 'StateCard', 'Surface'].map((name) => [name, name])),
    '@/components/vizit-icon': { VizitIcon: 'VizitIcon' },
    '@/providers/app-provider': { useApp: () => ({ locale: 'ru', theme: {} }) },
    '@/hooks/use-business-permissions': { useBusinessPermissions: () => permissions },
    '@/hooks/use-sign-out': { useSignOut: () => ({ isPending: false }) },
  });
  const { businessPermissions } = app.load('src/services/business-permissions.ts');
  const render = app.load('src/app/(business)/more.tsx').default;
  for (const role of ['owner', 'manager', 'staff']) {
    permissions = { ...businessPermissions(role), user: { role }, isLoading: false, isError: false };
    const items = elementTree(render()).flatMap((node) => node.props.items ?? []).map((item) => item.target);
    assert.equal(items.includes('billing'), role === 'owner');
    assert.equal(items.includes('/(business)/staff'), role !== 'staff');
    assert.ok(items.includes('tasks')); assert.ok(items.includes('telegram'));
  }
  permissions = { ...businessPermissions(), isLoading: false, isError: true, refetch: () => { retries += 1; } };
  const failed = elementTree(render());
  assert.ok(failed.some((node) => node.type === 'StateCard'));
  assert.equal(failed.flatMap((node) => node.props.items ?? []).length, 0);
  failed.find((node) => node.type === 'PremiumButton' && node.props.title === 'Повторить').props.onPress();
  assert.equal(retries, 1);
  assert.ok(failed.some((node) => node.type === 'PremiumButton' && node.props.title === 'Выйти'));
  permissions = { ...permissions, isError: false, isLoading: true };
  const pending = elementTree(render());
  assert.ok(pending.some((node) => node.type === 'ActivityIndicator'));
  assert.equal(pending.flatMap((node) => node.props.items ?? []).length, 0);
});

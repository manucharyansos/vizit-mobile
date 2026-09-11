import { BusinessUser } from './business';
import { ClientUser } from './client-account';
import { publicClient, tokenStore, TokenAudience } from './client';
import { guestBookingStore } from '../guest-booking-store';
import { synchronizePushDevice } from '../notifications';

type UnifiedSelection = {
  requires_selection: true;
  audiences: TokenAudience[];
};

type UnifiedSession = {
  requires_selection?: false;
  audience: TokenAudience;
  token: string;
  user: ClientUser | BusinessUser;
};

export type UnifiedLoginResult = UnifiedSelection | UnifiedSession;

export const unifiedAuthApi = {
  async login(identity: string, password: string, audience?: TokenAudience): Promise<UnifiedLoginResult> {
    const { data } = await publicClient.post('/mobile/auth/login', {
      identity,
      password,
      ...(audience ? { audience } : {}),
    });

    if (data?.requires_selection === true) {
      return {
        requires_selection: true,
        audiences: Array.isArray(data.audiences)
          ? data.audiences.filter((value: unknown): value is TokenAudience => value === 'client' || value === 'business')
          : [],
      };
    }

    if ((data?.audience !== 'client' && data?.audience !== 'business') || typeof data?.token !== 'string') {
      throw new Error('Invalid unified auth response');
    }

    const session = data as UnifiedSession;
    if (session.audience === 'client') {
      await guestBookingStore.clearClientBookingReferences();
    }
    await tokenStore.set(session.audience, session.token);
    void synchronizePushDevice(session.audience);
    return session;
  },
};

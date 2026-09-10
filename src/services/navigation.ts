import { Href, router } from 'expo-router';

/**
 * Expo Router prints "The action 'GO_BACK' was not handled" when a deep-linked
 * screen has no navigator history. Use a deterministic fallback instead.
 */
export function safeBack(fallback: Href = '/(customer)/discover' as Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

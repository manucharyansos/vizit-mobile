export type SignedInDestination = 'profile' | 'today' | 'admin';
export type AuthDestination = SignedInDestination | 'login';

/** Select the root login screen explicitly; /login also matches the legacy tab route. */
export function authNavigationState(destination: AuthDestination) {
  return destination === 'login'
    ? { index: 0, routes: [{ name: 'login' }] }
    : signedInNavigationState(destination);
}

/** Only reset history at an explicit successful sign-in/registration boundary. */
export function signedInNavigationState(destination: SignedInDestination) {
  return {
    index: 0,
    routes: [{
      name: destination === 'profile' ? '(customer)' : '(business)',
      state: { index: 0, routes: [{ name: destination }] },
    }],
  };
}

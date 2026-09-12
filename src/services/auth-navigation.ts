export type SignedInDestination = 'profile' | 'today' | 'admin';

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

/**
 * Compute the URL of the "other" Loomi surface (studio ↔ reporting)
 * based on the current hostname. Used by the user dropdown to offer a
 * one-click jump between the two apps in either environment.
 *
 * Examples:
 *   studio.loomilm.com       → https://reporting.loomilm.com
 *   reporting.loomilm.com    → https://studio.loomilm.com
 *   reporting.localhost:3000 → http://localhost:3000        (studio in dev)
 *   localhost:3000           → http://reporting.localhost:3000
 *
 * Returns `null` on SSR (no window) so callers can render nothing or a
 * disabled state until hydration.
 */
export function getOtherSurfaceUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const { protocol, host } = window.location;

  if (host.startsWith('studio.')) {
    return `${protocol}//reporting.${host.slice('studio.'.length)}`;
  }
  if (host.startsWith('reporting.')) {
    // Strip the reporting prefix — the studio surface lives on the bare
    // domain in prod (studio.*) and on bare localhost in dev.
    const rest = host.slice('reporting.'.length);
    return rest.startsWith('localhost')
      ? `${protocol}//${rest}`
      : `${protocol}//studio.${rest}`;
  }
  // Bare localhost in dev = studio side → cross-link to reporting.localhost
  if (host === 'localhost' || host.startsWith('localhost:')) {
    return `${protocol}//reporting.${host}`;
  }
  return null;
}

/** Which surface we are currently on. */
export function getCurrentSurface(): 'studio' | 'reporting' | null {
  if (typeof window === 'undefined') return null;
  return window.location.host.startsWith('reporting.') ? 'reporting' : 'studio';
}

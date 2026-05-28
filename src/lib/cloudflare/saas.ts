/**
 * Thin client for Cloudflare-for-SaaS custom-hostname management.
 *
 * Usage flow (per dealer hostname):
 *   1. Dealer adds DNS records, our DNS-verify check passes.
 *   2. `registerCustomHostname(hostname)` posts the hostname to CF.
 *      CF then validates the customer's CNAME and issues a Let's
 *      Encrypt cert against our fallback origin.
 *   3. `getCustomHostnameStatus(id)` polls for SSL provisioning state.
 *   4. `deleteCustomHostname(id)` cleans up when the dealer removes
 *      the domain from our UI.
 *
 * Configuration:
 *   - CLOUDFLARE_API_TOKEN — scoped token with Zone:SSL and Certificates
 *     edit permissions on the SaaS zone.
 *   - CLOUDFLARE_ZONE_ID — the zone hosting our SaaS endpoint.
 *
 * If either env var is unset, `isCloudflareConfigured()` returns false
 * and all calls become no-ops. That keeps DNS-only verification
 * working for dev / self-hosted setups without ripping the code path
 * out of the service.
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export interface CloudflareCustomHostname {
  id: string;
  hostname: string;
  status: string; // 'pending' | 'active' | 'active_redeploying' | 'moved' | 'pending_deletion' | 'deleted' | 'pending_blocked' | 'pending_migration' | 'pending_provisioned' | 'test_pending' | 'test_active' | 'test_active_apex' | 'test_blocked' | 'test_failed' | 'provisioned' | 'blocked'
  ssl: {
    status: string; // 'initializing' | 'pending_validation' | 'deleted' | 'pending_issuance' | 'pending_deployment' | 'pending_deletion' | 'pending_expiration' | 'expired' | 'active' | 'initializing_timed_out' | 'validation_timed_out' | 'issuance_timed_out' | 'deployment_timed_out' | 'deletion_timed_out' | 'pending_cleanup' | 'staging_deployment' | 'staging_active' | 'deactivating' | 'inactive' | 'backup_issued' | 'holding_deployment'
  };
}

export function isCloudflareConfigured(): boolean {
  return !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID);
}

/**
 * Normalize Cloudflare's many SSL/hostname states into the three
 * buckets we surface in the UI: pending / active / failed. CF
 * itself has ~20 statuses for various lifecycle phases that we
 * don't need granularity on.
 */
export function normalizeSslStatus(
  hostnameStatus: string,
  sslStatus: string,
): 'pending' | 'active' | 'failed' {
  // Active = CF is actively serving + cert is installed
  if (sslStatus === 'active' && (hostnameStatus === 'active' || hostnameStatus === 'active_redeploying')) {
    return 'active';
  }
  // Failed = anything timed out, expired, blocked, or explicitly bad
  if (
    sslStatus === 'initializing_timed_out' ||
    sslStatus === 'validation_timed_out' ||
    sslStatus === 'issuance_timed_out' ||
    sslStatus === 'deployment_timed_out' ||
    sslStatus === 'expired' ||
    sslStatus === 'inactive' ||
    hostnameStatus === 'blocked' ||
    hostnameStatus === 'pending_blocked'
  ) {
    return 'failed';
  }
  // Everything else = still in flight (CF is doing its thing)
  return 'pending';
}

async function cfFetch(
  path: string,
  init: RequestInit & { token: string },
): Promise<unknown> {
  const { token, ...rest } = init;
  const res = await fetch(`${CF_API_BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(rest.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Cloudflare's error shape: { success: false, errors: [{ code, message }], ... }
    const err = body as { errors?: { message?: string }[] };
    const message =
      err.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
      `Cloudflare API ${res.status}`;
    throw new CloudflareApiError(message, res.status);
  }
  return body;
}

export class CloudflareApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'CloudflareApiError';
  }
}

/**
 * Register a new custom hostname with Cloudflare. Returns the CF id
 * + initial status. Throws CloudflareApiError on API failure.
 * Returns null when CF isn't configured (caller handles fallback).
 */
export async function registerCustomHostname(
  hostname: string,
): Promise<CloudflareCustomHostname | null> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) return null;

  const body = (await cfFetch(`/zones/${zoneId}/custom_hostnames`, {
    token,
    method: 'POST',
    body: JSON.stringify({
      hostname: hostname.toLowerCase(),
      // dv = domain validated (Let's Encrypt). 'http' validation
      // means CF uses an HTTP challenge against the customer's
      // CNAME-pointed traffic — works as soon as DNS resolves to
      // our fallback origin, no extra TXT records needed.
      ssl: { method: 'http', type: 'dv' },
    }),
  })) as { result: CloudflareCustomHostname };
  return body.result;
}

export async function getCustomHostnameStatus(
  customHostnameId: string,
): Promise<CloudflareCustomHostname | null> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) return null;

  const body = (await cfFetch(
    `/zones/${zoneId}/custom_hostnames/${encodeURIComponent(customHostnameId)}`,
    { token, method: 'GET' },
  )) as { result: CloudflareCustomHostname };
  return body.result;
}

/**
 * Remove a custom hostname from CF. Idempotent — if CF returns 404
 * (already deleted on their side) we swallow it; any other error
 * propagates. Returns true on success / no-op, false when CF isn't
 * configured.
 */
export async function deleteCustomHostname(customHostnameId: string): Promise<boolean> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) return false;

  try {
    await cfFetch(
      `/zones/${zoneId}/custom_hostnames/${encodeURIComponent(customHostnameId)}`,
      { token, method: 'DELETE' },
    );
    return true;
  } catch (err) {
    if (err instanceof CloudflareApiError && err.status === 404) {
      // Already gone on CF's side — fine, treat as success.
      return true;
    }
    throw err;
  }
}

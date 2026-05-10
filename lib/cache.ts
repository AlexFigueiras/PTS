import { revalidateTag } from 'next/cache';

/**
 * Returns a consistent cache tag scoped to a tenant and resource.
 *
 * Convention: "tenant:<tenantId>:<resource>"
 *
 * Pass to `cacheTag()` inside `'use cache'` blocks, or use
 * `revalidateTenantResource` to invalidate after a mutation.
 */
export function getTenantTag(tenantId: string, resource: string): string {
  return `tenant:${tenantId}:${resource}`;
}

/**
 * Invalidates all cached data tagged with `getTenantTag(tenantId, resource)`.
 * Call this in the same Server Action that performs the mutation.
 *
 * Next.js 16: `revalidateTag` requires the cache profile as the second arg.
 * Use 'max' to invalidate across all cache profiles (on-demand revalidation).
 */
export function revalidateTenantResource(tenantId: string, resource: string): void {
  revalidateTag(getTenantTag(tenantId, resource), 'max');
}

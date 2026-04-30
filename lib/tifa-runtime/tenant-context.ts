import type { TenantContext } from "@/lib/framework/tenant";
import { createLocalTenantContext } from "@/lib/framework/tenant";

export function isSaasModeEnabled() {
  return process.env.TIFA_SAAS_MODE === "1";
}

export function resolveTenantContextFromHeaders(headers: Headers): TenantContext {
  if (!isSaasModeEnabled()) {
    return createLocalTenantContext();
  }

  const tenantId = headers.get("x-tifa-tenant-id")?.trim();
  const tenantSlug = headers.get("x-tifa-tenant-slug")?.trim() || tenantId;
  const userId = headers.get("x-tifa-user-id")?.trim() || undefined;

  if (!tenantId || !tenantSlug) {
    throw new Error("Tenant context is required when TIFA_SAAS_MODE=1.");
  }

  return {
    tenantId,
    tenantSlug,
    userId,
    roles: [],
    mode: "saas",
  };
}


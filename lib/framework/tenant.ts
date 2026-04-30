import type { ISODateTimeString, Tenant, TenantStatus } from "./types";

export const LOCAL_TENANT_ID = "local";

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  roles: string[];
  mode: "local" | "saas";
}

export function createLocalTenant(now: ISODateTimeString = new Date().toISOString()): Tenant {
  return {
    id: LOCAL_TENANT_ID,
    slug: "local",
    name: "Local Tifa",
    planCode: "local",
    status: "active",
    createdAt: now,
  };
}

export function createLocalTenantContext(): TenantContext {
  return {
    tenantId: LOCAL_TENANT_ID,
    tenantSlug: "local",
    roles: ["owner"],
    mode: "local",
  };
}

export function isActiveTenantStatus(status: TenantStatus) {
  return status === "active";
}

export function requireTenantId(context: Pick<TenantContext, "tenantId">): string {
  if (!context.tenantId.trim()) {
    throw new Error("Tenant context is required.");
  }

  return context.tenantId;
}

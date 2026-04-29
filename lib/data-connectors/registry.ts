import type { DataConnector } from "./types";
import { createPostgresFinancialConnector } from "./postgres";

export class DataConnectorRegistry {
  private connectors = new Map<string, DataConnector>();

  register(connector: DataConnector) {
    this.connectors.set(connector.name, connector);
    return this;
  }

  get(name: string) {
    return this.connectors.get(name) ?? null;
  }

  list() {
    return [...this.connectors.values()];
  }
}

export function createDefaultDataConnectorRegistry() {
  return new DataConnectorRegistry().register(createPostgresFinancialConnector());
}


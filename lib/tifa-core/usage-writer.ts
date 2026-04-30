import type { UsageEvent } from "@/lib/framework/types";

export interface UsageEventWriter {
  write(event: UsageEvent): Promise<void>;
}

export class NoopUsageEventWriter implements UsageEventWriter {
  async write(event: UsageEvent): Promise<void> {
    void event;
  }
}


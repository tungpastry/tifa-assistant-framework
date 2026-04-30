import type { VoiceProvider } from "./types";
import { PiperVoiceProvider } from "./providers/piper";
import { ViPiperVoiceProvider } from "./providers/vipiper";
import { VieNeuVoiceProvider } from "./providers/vieneu";

export class VoiceProviderRegistry {
  private providers = new Map<string, VoiceProvider>();

  register(provider: VoiceProvider) {
    this.providers.set(provider.name, provider);
    return this;
  }

  get(name: string) {
    return this.providers.get(name) ?? null;
  }

  list() {
    return [...this.providers.values()];
  }

  async health() {
    return Promise.all(this.list().map((provider) => provider.health()));
  }

  async getAvailableVoices() {
    const providers = this.list();
    const health = await Promise.all(providers.map((provider) => provider.health()));
    const voices = [];

    for (let index = 0; index < providers.length; index++) {
      const provider = providers[index];
      const providerHealth = health[index];
      const providerVoices = await provider.getVoices();
      voices.push(...providerVoices.map((voice) => ({
        ...voice,
        provider: provider.name,
        providerStatus: providerHealth.status,
        enabled: providerHealth.status === "ok" || providerHealth.status === "degraded",
      })));
    }

    return { health, voices };
  }
}

export function createDefaultVoiceProviderRegistry() {
  return new VoiceProviderRegistry()
    .register(new PiperVoiceProvider())
    .register(new ViPiperVoiceProvider())
    .register(new VieNeuVoiceProvider());
}

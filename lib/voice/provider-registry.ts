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
}

export function createDefaultVoiceProviderRegistry() {
  return new VoiceProviderRegistry()
    .register(new PiperVoiceProvider())
    .register(new ViPiperVoiceProvider())
    .register(new VieNeuVoiceProvider());
}


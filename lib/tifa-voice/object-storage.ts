export interface VoiceAssetObject {
  key: string;
  contentType: string;
  byteSize?: number;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface VoiceAssetStorage {
  name: string;
  enabled: boolean;
  putObject(input: VoiceAssetObject & { body: Uint8Array }): Promise<VoiceAssetObject>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export class ObjectStorageVoiceAssetScaffold implements VoiceAssetStorage {
  name = "object-storage-voice-assets";
  enabled = process.env.TIFA_OBJECT_STORAGE_ENABLED === "1";

  async putObject(input: VoiceAssetObject & { body: Uint8Array }): Promise<VoiceAssetObject> {
    if (!this.enabled) {
      throw new Error("Object storage voice assets are disabled.");
    }

    return {
      key: input.key,
      contentType: input.contentType,
      byteSize: input.byteSize ?? input.body.byteLength,
      metadata: input.metadata,
    };
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    void expiresInSeconds;

    if (!this.enabled) {
      throw new Error("Object storage voice assets are disabled.");
    }

    return key;
  }
}


import { expect, test } from "@playwright/test";

test.describe("deployed Tifa runtime", () => {
  test.skip(
    process.env.PLAYWRIGHT_DEPLOYMENT !== "1",
    "Set PLAYWRIGHT_DEPLOYMENT=1 to validate a live deployment.",
  );

  test("reports a healthy Piper-only deployment", async ({ request }) => {
    const healthResponse = await request.get("/api/health");
    expect(healthResponse.status()).toBe(200);

    const health = await healthResponse.json();
    expect(health.status).toBe("ok");
    expect(health.checks?.piper?.status).toBe("ok");
    expect(health.checks?.tts_worker?.status).toBe("ok");

    const providersResponse = await request.get("/api/voice/providers");
    expect(providersResponse.status()).toBe(200);

    const providers = await providersResponse.json();
    expect(providers.providers).toHaveLength(1);
    expect(providers.providers[0]?.provider).toBe("piper");
    expect(providers.voices.length).toBeGreaterThan(0);
    expect(providers.voices.every((voice: { provider?: string }) => voice.provider === "piper")).toBe(true);
  });
});

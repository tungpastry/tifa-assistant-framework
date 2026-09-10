import { expect, test } from "@playwright/test";

const now = "2026-01-01T00:00:00.000Z";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() {
      window.setTimeout(() => this.dispatchEvent(new Event("ended")), 0);
      return Promise.resolve();
    };
  });

  await page.route("**/api/chat/sessions", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "session_e2e",
        title: "TifaWidget",
        mood: "focused",
        created_at: now,
        updated_at: now,
      }),
    });
  });

  await page.route("**/api/chat/sessions/*/messages", async (route) => {
    const body = route.request().postDataJSON() as {
      role?: string;
      content?: string;
      mood?: string;
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "message_e2e",
        session_id: "session_e2e",
        role: body.role,
        content: body.content,
        mood: body.mood,
        voice_job_id: null,
        model: null,
        created_at: now,
      }),
    });
  });

  await page.route("**/api/voice/providers", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        providers: [{ provider: "piper", status: "ok" }],
        voices: [
          {
            id: "tifa-default",
            name: "Tifa default Piper voice",
            locale: "en-US",
            modelId: "e2e-piper-model",
            licenseClass: "unknown",
            provider: "piper",
            providerStatus: "ok",
            enabled: true,
          },
        ],
      }),
    });
  });

  await page.route("**/api/voice/jobs", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "ready",
        cache_hit: true,
        job_id: "tts_e2e",
        audio_url: "/e2e-audio.wav",
        voice: "tifa-default",
        model: "e2e-piper-model",
        error: null,
      }),
    });
  });

  await page.route("**/e2e-audio.wav", async (route) => {
    await route.fulfill({
      contentType: "audio/wav",
      body: Buffer.from("RIFF0000WAVE", "ascii"),
    });
  });

  await page.route("**/api/tifa/stream", async (route) => {
    const sse = [
      'event: start\ndata: {"provider":"playwright","model":"deterministic","provider_type":"local"}',
      'event: delta\ndata: {"text":"Tifa E2E "}',
      'event: delta\ndata: {"text":"reply."}',
      'event: done\ndata: {"provider":"playwright","model":"deterministic","provider_type":"local"}',
      "",
    ].join("\n\n");

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      headers: { "Cache-Control": "no-cache" },
      body: sse,
    });
  });
});

test("renders the Tifa widget and completes a deterministic chat flow", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Tifa AI");
  await expect(page.getByRole("heading", { level: 1, name: "Tifa AI" })).toBeVisible();
  await expect(page.getByText("Hey trader, how are you feeling today?")).toBeVisible();

  const voiceButton = page.getByRole("button", { name: "Disable voice" });
  await voiceButton.click();
  await expect(page.getByRole("button", { name: "Enable voice" })).toBeVisible();

  const input = page.getByRole("textbox");
  await input.fill("Hello from Playwright");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Hello from Playwright")).toBeVisible();
  await expect(page.getByText("Tifa E2E reply.")).toBeVisible();
  await expect(page.getByText(/playwright \/ deterministic \(local\)/i)).toBeVisible();
  await expect(input).toBeEnabled();

  const minimizeButton = page.getByRole("button", { name: "Minimize chat" });
  await minimizeButton.click();
  await expect(input).toBeHidden();
  await minimizeButton.click();
  await expect(input).toBeVisible();
});

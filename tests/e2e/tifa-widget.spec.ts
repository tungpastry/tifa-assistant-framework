import { expect, test, type Page } from "@playwright/test";

const now = "2026-01-01T00:00:00.000Z";

async function readThemeContrast(page: Page) {
  return page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const value = (name: string) => style.getPropertyValue(name).trim();
    const luminance = (hex: string) => {
      const normalized = hex.length === 4
        ? `#${hex.slice(1).split("").map((channel) => channel.repeat(2)).join("")}`
        : hex;
      const channels = normalized.match(/[a-f\d]{2}/gi)?.map((channel) => parseInt(channel, 16) / 255) ?? [];
      const linear = channels.map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const ratio = (first: string, second: string) => {
      const firstLuminance = luminance(value(first));
      const secondLuminance = luminance(value(second));
      return (Math.max(firstLuminance, secondLuminance) + 0.05) /
        (Math.min(firstLuminance, secondLuminance) + 0.05);
    };

    return {
      primaryText: ratio("--foreground", "--background"),
      secondaryText: ratio("--text-secondary", "--background"),
      buttonText: ratio("--primary-contrast", "--primary"),
      controlBoundary: ratio("--control-border", "--surface"),
    };
  });
}

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

test("renders the Aurora landing page with persistent dark and light themes", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Tifa AI");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Build every assistant experience with Tifa AI.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore the framework" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Tifa AI assistant" })).toBeVisible();
  await expect(page.getByText("Hey trader, how are you feeling today?")).toBeHidden();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const darkContrast = await readThemeContrast(page);
  expect(darkContrast.primaryText).toBeGreaterThanOrEqual(4.5);
  expect(darkContrast.secondaryText).toBeGreaterThanOrEqual(4.5);
  expect(darkContrast.buttonText).toBeGreaterThanOrEqual(4.5);
  expect(darkContrast.controlBoundary).toBeGreaterThanOrEqual(3);

  const noHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(noHorizontalOverflow).toBe(true);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

  const themeButton = page.getByRole("button", { name: "Switch to light theme" });
  const themeButtonBox = await themeButton.boundingBox();
  expect(themeButtonBox?.width).toBeGreaterThanOrEqual(44);
  expect(themeButtonBox?.height).toBeGreaterThanOrEqual(44);
  await themeButton.click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem("theme"))).toBe("light");

  const lightContrast = await readThemeContrast(page);
  expect(lightContrast.primaryText).toBeGreaterThanOrEqual(4.5);
  expect(lightContrast.secondaryText).toBeGreaterThanOrEqual(4.5);
  expect(lightContrast.buttonText).toBeGreaterThanOrEqual(4.5);
  expect(lightContrast.controlBoundary).toBeGreaterThanOrEqual(3);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
});

test("opens the Tifa widget and completes a transparent local AI chat flow", async ({ page }) => {
  let chatSessionRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/chat/sessions")) {
      chatSessionRequests += 1;
    }
  });

  await page.goto("/");
  await expect(page.getByText("Hey trader, how are you feeling today?")).toBeHidden();
  expect(chatSessionRequests).toBe(0);

  await page.getByRole("button", { name: "Open Tifa AI assistant" }).click();
  const panel = page.getByTestId("tifa-panel");
  await expect(panel).toBeVisible();
  await expect(page.getByText("Hey trader, how are you feeling today?")).toBeVisible();
  await expect.poll(() => chatSessionRequests).toBeGreaterThan(0);

  const viewport = page.viewportSize();
  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.y).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(viewport!.height);

  const panelButtons = await panel.getByRole("button").all();
  await expect.poll(async () => {
    const boxes = await Promise.all(panelButtons.map((button) => button.boundingBox()));
    return Math.min(...boxes.flatMap((box) => box ? [box.width, box.height] : [0]));
  }).toBeGreaterThanOrEqual(44);

  const voiceButton = page.getByRole("button", { name: "Disable voice" });
  await voiceButton.click();
  await expect(page.getByRole("button", { name: "Enable voice" })).toBeVisible();

  const input = page.getByRole("textbox", { name: "Message Tifa" });
  await input.fill("Hello from Playwright");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("Hello from Playwright")).toBeVisible();
  await expect(page.getByText("Tifa E2E reply.")).toBeVisible();
  await expect(input).toBeEnabled();

  await page.getByRole("button", { name: "Local AI details" }).click();
  const aiDetails = page.getByRole("dialog", { name: "AI processing details" });
  await expect(aiDetails).toBeVisible();
  await expect(aiDetails).toContainText("playwright");
  await expect(aiDetails).toContainText("deterministic");
  await expect(aiDetails).toContainText("Piper · local TTS");

  await page.getByRole("button", { name: "Close Tifa AI assistant" }).click();
  await expect(input).toBeHidden();
  await page.getByRole("button", { name: "Open Tifa AI assistant" }).click();
  await expect(input).toBeVisible();
  await expect(page.getByText("Tifa E2E reply.")).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
});

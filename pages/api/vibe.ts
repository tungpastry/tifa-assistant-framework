import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(process.env.QWEN_API_URL as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3:4b-instruct-2507-q4_K_M",
        prompt:
          "Generate a short motivational trading vibe (1–2 lines) with one emoji. Keep it in a calm and positive tone.",
        stream: false,
      }),
    });

    const data = await response.json();
    const text = data?.response || "Stay focused and trust your setup. 💎";

    res.status(200).json({ vibe: text, model: "qwen3:4b-instruct-2507-q4_K_M" });
  } catch (error: unknown) {
    console.error("Error fetching Qwen vibe:", error);
    res.status(500).json({ error: "Failed to fetch vibe." });
  }
}

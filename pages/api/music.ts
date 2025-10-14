import type { NextApiRequest, NextApiResponse } from "next";

/**
 * API: /api/music
 * Description: Gợi ý 5 bài nhạc thư giãn cho trader từ mô hình Gemma3
 * Model chạy qua Ollama: gemma3:270m-it-qat
 * Host: UbuntuServer (127.0.0.1 hoặc IP LAN)
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ✅ Ưu tiên localhost vì Next.js chạy cùng server với Ollama
    const apiUrl = process.env.GEMMA_API_URL || "http://127.0.0.1:11434/api/generate";
    console.log("🎵 Calling Gemma API:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:270m-it-qat",
        prompt: `
Suggest 5 relaxing songs for traders to stay focused and calm during forex sessions.
Output JSON format: [{"title": "...", "artist": "..."}].
        `,
        stream: false,
      }),
    });

    // ✅ Nếu Ollama không phản hồi 200 → trả lỗi chi tiết
    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Gemma API error response:", text);
      return res.status(500).json({ error: `Gemma API returned ${response.status}` });
    }

    const data = await response.json();
    const reply = data?.response || "[]";

    let playlist: Array<{ title: string; artist: string }> = [];

    try {
      playlist = JSON.parse(reply);
    } catch {
      console.warn("⚠️ Gemma returned non-JSON text, fallback playlist.");
      playlist = [
        { title: "Weightless", artist: "Marconi Union" },
        { title: "Bloom", artist: "Odesza" },
        { title: "Focus", artist: "Haux" },
      ];
    }

    return res.status(200).json({
      playlist,
      model: "gemma3:270m-it-qat",
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("💥 Error fetching playlist:", error.message);
      return res.status(500).json({ error: error.message });
    } else {
      console.error("💥 Unknown error fetching playlist:", error);
      return res.status(500).json({ error: "Failed to fetch playlist (unknown)" });
    }
  }
}

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mood } = req.query;
  if (!mood || typeof mood !== "string") {
    return res.status(400).json({ error: "Missing mood parameter" });
  }

  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemma3:270m-it-qat",
      prompt: `
Suggest 5 songs for a trader who is feeling ${mood}.
Format JSON: [{"title": "...", "artist": "..."}]
Keep the vibe emotional, relaxing, or energetic depending on mood.
      `,
      stream: false,
    }),
  });

  const data = await response.json();
  let playlist = [];
  try {
    playlist = JSON.parse(data.response);
  } catch {
    playlist = [{ title: "Weightless", artist: "Marconi Union" }];
  }

  res.status(200).json({ mood, playlist });
}

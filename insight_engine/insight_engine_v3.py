#!/usr/bin/env python3
import json
import logging
import os
import subprocess
import traceback
from pathlib import Path

import requests
from dotenv import load_dotenv

from runtime_paths import ensure_runtime_dirs, today_string

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
load_dotenv(REPO_ROOT / ".env")

_, OUTPUT_DIR, LOG_DIR = ensure_runtime_dirs()

LOG_FILE = LOG_DIR / "tradevibe_emotion.log"
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)


def build_llm_urls():
    urls = []

    qwen_api_url = os.environ.get("QWEN_API_URL")
    ollama_url = os.environ.get("OLLAMA_URL")

    if qwen_api_url:
        urls.append(qwen_api_url.rstrip("/"))

    if ollama_url:
        urls.append(f"{ollama_url.rstrip('/')}/api/generate")

    urls.extend([
        "http://127.0.0.1:11434/api/generate",
        "http://192.168.1.15:11434/api/generate",
    ])

    deduped = []
    for url in urls:
        if url not in deduped:
            deduped.append(url)

    return deduped


OLLAMA_API_URLS = build_llm_urls()
PIPER_BIN = os.environ.get("PIPER_BIN", "/home/nexus/piper-env/bin/piper")
PIPER_MODEL = os.environ.get(
    "PIPER_MODEL", "/home/nexus/piper/voices/en_US-libritts-high.onnx"
)

# === Emotion-based prompt templates ===
MOOD_PROMPTS = {
    "focused": "Generate a short powerful vibe for traders who are deeply focused on charts. Calm energy, precise, disciplined. Add one emoji.",
    "tired": "Generate a gentle motivational vibe for tired traders. Encouraging, soft tone, friendly, 1-2 emojis.",
    "anxious": "Generate a reassuring vibe for anxious traders. Talk about patience and control. Keep it under 25 words. Include 1-2 peaceful emojis.",
    "confident": "Generate a vibe for confident traders. Encourage humility and balance, with strong tone. Include 1-2 energetic emojis.",
    "happy": "Generate a cheerful, uplifting vibe for happy traders celebrating small wins. Include 2 emojis and a positive close.",
    "default": "Generate a short motivational vibe for traders. Friendly tone, 1-2 emojis, 25 words max."
}

def choose_prompt(mood: str) -> str:
    return MOOD_PROMPTS.get(mood.lower(), MOOD_PROMPTS["default"])


def generate_vibe(mood="default"):
    prompt = choose_prompt(mood)
    payload = {"model": "qwen3:4b-instruct-2507-q4_K_M", "prompt": prompt, "stream": False}
    last_err = None

    for api_url in OLLAMA_API_URLS:
        try:
            r = requests.post(api_url, json=payload, timeout=45)
            r.raise_for_status()
            raw_output = r.text.strip()
            logging.info(f"[RAW LLM OUTPUT] {raw_output} (via {api_url})")

            try:
                data = json.loads(raw_output)
                if isinstance(data, dict) and data.get("error"):
                    last_err = data["error"]
                    continue
                text = data.get("response", "").strip()
            except json.JSONDecodeError:
                text = raw_output.strip()
                logging.warning(f"Non-JSON output from {api_url}")

            if text:
                logging.info(f"Mood={mood} generated vibe successfully.")
                return text
        except Exception as e:
            last_err = str(e)
            logging.warning(f"Ollama request failed ({api_url}): {e}")
            continue

    logging.warning(f"All Ollama endpoints failed, last error: {last_err}")
    return "Stay calm and focused 🌿 every trade is a lesson."


def synthesize_voice(text, filename):
    out_wav = OUTPUT_DIR / filename
    cmd = [PIPER_BIN, "--model", PIPER_MODEL, "--output_file", out_wav]
    logging.info(f"Running Piper for {filename}")

    try:
        subprocess.run(cmd, input=text.encode("utf-8"), check=True)
        logging.info(f"Voice saved to {out_wav}")
        return out_wav
    except subprocess.CalledProcessError as e:
        logging.error(f"Piper failed: {e}")
    except Exception:
        logging.error(traceback.format_exc())
    return None


if __name__ == "__main__":
    try:
        mood = os.environ.get("TRADERVIBE_MOOD", "default")
        today = today_string()
        vibe_text = generate_vibe(mood)
        json_path = OUTPUT_DIR / f"vibe_{mood}_{today}.json"

        with open(json_path, "w", encoding="utf-8") as handle:
            json.dump({"mood": mood, "text": vibe_text}, handle, ensure_ascii=False, indent=2)
        logging.info(f"Saved vibe JSON to {json_path}")

        synthesize_voice(vibe_text, f"vibe_{mood}_{today}.wav")
        logging.info("Emotion insight generation completed.")
    except Exception:
        logging.error(traceback.format_exc())

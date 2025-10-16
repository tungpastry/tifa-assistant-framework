#!/usr/bin/env python3
import os, json, subprocess, datetime, requests, logging, traceback

# === Paths & setup ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output/daily_vibes")
LOG_DIR = os.path.join(BASE_DIR, "logs")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, "tradevibe_emotion.log")
logging.basicConfig(filename=LOG_FILE, level=logging.INFO,
                    format="%(asctime)s - %(levelname)s - %(message)s")

# === Config ===
OLLAMA_URLS = [
    os.environ.get("OLLAMA_URL", "http://192.168.1.15:11434"),  # Desktop default
    "http://127.0.0.1:11434",  # fallback local
]
PIPER_BIN = "/home/nexus/piper-env/bin/piper"
PIPER_MODEL = "/home/nexus/piper/voices/en_US-libritts-high.onnx"

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
    """Return prompt based on mood key"""
    return MOOD_PROMPTS.get(mood.lower(), MOOD_PROMPTS["default"])

# === Core functions ===
def generate_vibe(mood="default"):
    prompt = choose_prompt(mood)
    payload = {"model": "qwen3:4b-instruct-2507-q4_K_M", "prompt": prompt, "stream": False}
    last_err = None

    for base in OLLAMA_URLS:
        try:
            r = requests.post(f"{base}/api/generate", json=payload, timeout=45)
            raw_output = r.text.strip()
            logging.info(f"[RAW LLM OUTPUT] {raw_output} (via {base})")

            try:
                data = json.loads(raw_output)
                if isinstance(data, dict) and data.get("error"):
                    last_err = data["error"]
                    continue
                text = data.get("response", "").strip()
            except json.JSONDecodeError:
                text = raw_output.strip()
                logging.warning(f"⚠️ Non-JSON output from {base}")

            if text:
                logging.info(f"[{datetime.datetime.now()}] Mood: {mood} → Generated vibe: {text}")
                return text
        except Exception as e:
            last_err = str(e)
            logging.warning(f"⚠️ Ollama request failed ({base}): {e}")
            continue

    logging.warning(f"All Ollama endpoints failed, last error: {last_err}")
    return "Stay calm and focused 🌿 every trade is a lesson."


def synthesize_voice(text, filename):
    """Use Piper TTS"""
    out_wav = os.path.join(OUTPUT_DIR, filename)
    cmd = [PIPER_BIN, "--model", PIPER_MODEL, "--output_file", out_wav]
    logging.info(f"🎙 Running Piper: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, input=text.encode("utf-8"), check=True)
        logging.info(f"✅ Voice saved to {out_wav}")
        return out_wav
    except subprocess.CalledProcessError as e:
        logging.error(f"❌ Piper failed: {e}")
    except Exception as e:
        logging.error(f"❌ Unknown Piper error: {traceback.format_exc()}")
    return None


# === Entry point ===
if __name__ == "__main__":
    try:
        mood = os.environ.get("TRADERVIBE_MOOD", "default")
        vibe_text = generate_vibe(mood)
        json_path = os.path.join(OUTPUT_DIR, f"vibe_{mood}_{datetime.date.today()}.json")

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump({"mood": mood, "text": vibe_text}, f, ensure_ascii=False, indent=2)
        logging.info(f"[Saved] {json_path}")

        synthesize_voice(vibe_text, f"vibe_{mood}_{datetime.date.today()}.wav")
        logging.info("✅ Emotion-based Insight complete.")
    except Exception as e:
        logging.error(f"❌ Unhandled exception: {traceback.format_exc()}")

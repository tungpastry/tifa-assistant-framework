#!/usr/bin/env python3
from dotenv import load_dotenv
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "..", ".env")

print(f"Looking for .env at: {ENV_PATH}")

if load_dotenv(ENV_PATH):
    print(".env loaded successfully")
else:
    print("Failed to load .env")

for key in [
    "TRADEVIBE_RUNTIME_DIR",
    "TRADEVIBE_TIMEZONE",
    "QWEN_API_URL",
    "TIFA_API_URL",
    "YOUTUBE_API_KEY",
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_SECRET",
    "PIPER_BIN",
    "PIPER_MODEL",
]:
    print(f"{key}: {'set' if os.getenv(key) else 'missing'}")

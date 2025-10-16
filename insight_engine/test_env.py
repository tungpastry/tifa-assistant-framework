#!/usr/bin/env python3
from dotenv import load_dotenv
import os

# ✅ Load file .env ở thư mục cha (../.env)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, '..', '.env')

print(f"🔍 Looking for .env at: {ENV_PATH}")

# ✅ Load env
if load_dotenv(ENV_PATH):
    print("✅ .env loaded successfully!")
else:
    print("⚠️ Failed to load .env")

# ✅ Test output
print("YOUTUBE_API_KEY:", os.getenv("YOUTUBE_API_KEY"))
print("SPOTIFY_CLIENT_ID:", os.getenv("SPOTIFY_CLIENT_ID"))
print("SPOTIFY_SECRET:", os.getenv("SPOTIFY_SECRET"))

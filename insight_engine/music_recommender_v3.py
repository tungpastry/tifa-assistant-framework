#!/usr/bin/env python3
import base64
import json
import logging
import os
import traceback
from pathlib import Path

import requests
from dotenv import load_dotenv

from runtime_paths import ensure_runtime_dirs, today_string, write_latest_manifest

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
_, OUTPUT_DIR, LOG_DIR = ensure_runtime_dirs()

LOG_FILE = LOG_DIR / "tradevibe_music.log"
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

load_dotenv(REPO_ROOT / ".env")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_SECRET = os.getenv("SPOTIFY_SECRET")

logging.info(f"YouTube key configured: {bool(YOUTUBE_API_KEY)}")
logging.info(f"Spotify credentials configured: {bool(SPOTIFY_CLIENT_ID)}")


def get_spotify_token():
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_SECRET:
        logging.warning("Spotify credentials missing, skipping Spotify lookup.")
        return None

    try:
        auth_str = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_SECRET}"
        b64_auth = base64.b64encode(auth_str.encode()).decode()
        headers = {"Authorization": f"Basic {b64_auth}"}
        data = {"grant_type": "client_credentials"}
        r = requests.post("https://accounts.spotify.com/api/token", headers=headers, data=data, timeout=10)
        r.raise_for_status()
        token = r.json()["access_token"]
        logging.info("Spotify token retrieved successfully.")
        return token
    except Exception:
        logging.error(traceback.format_exc())
        return None


def search_youtube(mood="focused"):
    if not YOUTUBE_API_KEY:
        logging.warning("Missing YOUTUBE_API_KEY.")
        return []

    try:
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": f"{mood} trading music",
            "type": "video",
            "maxResults": 5,
            "key": YOUTUBE_API_KEY
        }
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        items = r.json().get("items", [])
        results = [
            {"title": it["snippet"]["title"], "url": f"https://www.youtube.com/watch?v={it['id']['videoId']}"}
            for it in items
        ]
        logging.info(f"YouTube results for mood '{mood}': {len(results)} items.")
        return results
    except Exception:
        logging.error(traceback.format_exc())
        return []


def search_spotify(mood="focused"):
    try:
        token = get_spotify_token()
        if not token:
            return []

        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(
            "https://api.spotify.com/v1/search",
            headers=headers,
            params={"q": f"{mood} trading", "type": "playlist", "limit": 5},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        playlists = data.get("playlists", {}).get("items", []) or []

        valid_playlists = []
        for p in playlists:
            try:
                name = p.get("name")
                url = p.get("external_urls", {}).get("spotify")
                if name and url:
                    valid_playlists.append({"name": name, "url": url})
            except Exception as exc:
                logging.error(f"Skipped invalid Spotify playlist: {exc}")
                continue

        return valid_playlists

    except Exception as exc:
        logging.error(f"Spotify API error: {exc}", exc_info=True)
        return []


def save_music_json(mood, youtube_list, spotify_list):
    today = today_string()
    filename = OUTPUT_DIR / f"music_{mood}_{today}.json"
    data = {
        "mood": mood,
        "youtube": youtube_list,
        "spotify": spotify_list,
        "created_at": today,
    }
    try:
        with open(filename, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
        logging.info(f"Saved playlist to: {filename}")
        return filename
    except Exception:
        logging.error(traceback.format_exc())
        raise


if __name__ == "__main__":
    try:
        mood = os.environ.get("TRADERVIBE_MOOD", "focused")
        today = today_string()
        logging.info(f"Fetching music for mood: {mood}")

        yt_results = search_youtube(mood)
        sp_results = search_spotify(mood)
        music_path = save_music_json(mood, yt_results, sp_results)
        vibe_path = OUTPUT_DIR / f"vibe_{mood}_{today}.json"
        audio_path = OUTPUT_DIR / f"vibe_{mood}_{today}.wav"

        write_latest_manifest(
            date=today,
            mood=mood,
            music_path=music_path,
            vibe_path=vibe_path,
            audio_path=audio_path if audio_path.exists() else None,
        )

        logging.info("Music recommender completed successfully.")
        print(f"Music recommender completed for mood: {mood}")
    except Exception:
        logging.error(traceback.format_exc())
        print("Music recommender failed. Check logs for details.")

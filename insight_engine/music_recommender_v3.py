#!/usr/bin/env python3
import os, json, requests, base64, datetime, logging, traceback
from dotenv import load_dotenv

# === Paths & Setup ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output/daily_vibes")
LOG_DIR = os.path.join(BASE_DIR, "logs")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, "tradevibe_music.log")
logging.basicConfig(filename=LOG_FILE, level=logging.INFO,
                    format="%(asctime)s - %(levelname)s - %(message)s")

# === Load ENV ===
load_dotenv(os.path.join(BASE_DIR, "../.env"))
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_SECRET = os.getenv("SPOTIFY_SECRET")

logging.info(f"🎵 YouTube key loaded: {bool(YOUTUBE_API_KEY)}")
logging.info(f"🎵 Spotify credentials loaded: {bool(SPOTIFY_CLIENT_ID)}")

# === Spotify Token ===
def get_spotify_token():
    try:
        auth_str = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_SECRET}"
        b64_auth = base64.b64encode(auth_str.encode()).decode()
        headers = {"Authorization": f"Basic {b64_auth}"}
        data = {"grant_type": "client_credentials"}
        r = requests.post("https://accounts.spotify.com/api/token", headers=headers, data=data, timeout=10)
        r.raise_for_status()
        token = r.json()["access_token"]
        logging.info("✅ Spotify token retrieved successfully.")
        return token
    except Exception as e:
        logging.error(f"❌ Failed to get Spotify token: {traceback.format_exc()}")
        return None

# === YouTube search ===
def search_youtube(mood="focused"):
    if not YOUTUBE_API_KEY:
        logging.warning("⚠️ Missing YOUTUBE_API_KEY.")
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
        logging.info(f"✅ YouTube results for mood '{mood}': {len(results)} items.")
        return results
    except Exception as e:
        logging.error(f"❌ YouTube API error: {traceback.format_exc()}")
        return []

# === Spotify search ===
def search_spotify(mood="focused"):
    try:
        token = get_spotify_token()
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(
            "https://api.spotify.com/v1/search",
            headers=headers,
            params={"q": f"{mood} trading", "type": "playlist", "limit": 5}
        )
        r.raise_for_status()
        data = r.json()
        playlists = data.get("playlists", {}).get("items", [])
        logging.info(f"Spotify raw response: {json.dumps(data, indent=2)[:1000]}")

        valid_playlists = []
        for p in playlists:
            try:
                name = p.get("name")
                url = p.get("external_urls", {}).get("spotify")
                if name and url:
                    valid_playlists.append({"name": name, "url": url})
            except Exception as e:
                logging.error(f"⚠️ Skipped invalid playlist: {e}")
                continue

        return valid_playlists

    except Exception as e:
        logging.error(f"❌ Spotify API error: {e}", exc_info=True)
        return []


# === Save results ===
def save_music_json(mood, youtube_list, spotify_list):
    filename = os.path.join(OUTPUT_DIR, f"music_{mood}_{datetime.date.today()}.json")
    data = {
        "mood": mood,
        "youtube": youtube_list,
        "spotify": spotify_list,
        "created_at": datetime.datetime.now().isoformat()
    }
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logging.info(f"💾 Saved playlist to: {filename}")
    except Exception as e:
        logging.error(f"❌ Failed to save music JSON: {traceback.format_exc()}")

# === Entry Point ===
if __name__ == "__main__":
    try:
        mood = os.environ.get("TRADERVIBE_MOOD", "focused")
        logging.info(f"🎧 Fetching music for mood: {mood}")

        yt_results = search_youtube(mood)
        sp_results = search_spotify(mood)
        save_music_json(mood, yt_results, sp_results)

        logging.info("✅ Music recommender completed successfully.")
        print(f"✅ Music recommender completed for mood: {mood}")
    except Exception as e:
        logging.error(f"❌ Unhandled exception: {traceback.format_exc()}")
        print("❌ Music recommender failed. Check logs for details.")

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

REPO_ROOT = Path(__file__).resolve().parent.parent
TIMEZONE = os.getenv("TRADEVIBE_TIMEZONE", "Asia/Ho_Chi_Minh")


def resolve_runtime_dir() -> Path:
    runtime_dir = os.getenv("TRADEVIBE_RUNTIME_DIR")
    if runtime_dir:
        path = Path(runtime_dir)
        return path if path.is_absolute() else REPO_ROOT / path

    return REPO_ROOT / "runtime"


def ensure_runtime_dirs() -> tuple[Path, Path, Path]:
    runtime_dir = resolve_runtime_dir()
    daily_vibes_dir = runtime_dir / "daily_vibes"
    logs_dir = runtime_dir / "logs"

    daily_vibes_dir.mkdir(parents=True, exist_ok=True)
    logs_dir.mkdir(parents=True, exist_ok=True)

    return runtime_dir, daily_vibes_dir, logs_dir


def today_string() -> str:
    return datetime.now(ZoneInfo(TIMEZONE)).date().isoformat()


def repo_relative(target_path: Path) -> str:
    try:
        return str(target_path.resolve().relative_to(REPO_ROOT.resolve()))
    except ValueError:
        return str(target_path)


def write_latest_manifest(
    *,
    date: str,
    mood: str,
    music_path: Path,
    vibe_path: Path,
    audio_path: Path | None,
) -> None:
    runtime_dir, _, _ = ensure_runtime_dirs()
    manifest_path = runtime_dir / "latest.json"
    payload = {
        "date": date,
        "mood": mood,
        "musicPath": repo_relative(music_path),
        "vibePath": repo_relative(vibe_path),
        "audioPath": repo_relative(audio_path) if audio_path else None,
        "updatedAt": datetime.now(ZoneInfo(TIMEZONE)).isoformat(),
    }

    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)

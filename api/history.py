import json
import os
from datetime import datetime

VERCEL = os.environ.get('VERCEL', '') == '1'
DATA_DIR = '/tmp/data' if VERCEL else os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
HISTORY_PATH = os.path.join(DATA_DIR, 'history.json')

MAX_HISTORY = 100


def _ensure_file():
    if not os.path.exists(HISTORY_PATH):
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(HISTORY_PATH, 'w', encoding='utf-8') as f:
            json.dump([], f)


def load_history() -> list:
    _ensure_file()
    try:
        with open(HISTORY_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, list):
            return []
        return data
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def save_history(history: list):
    _ensure_file()
    with open(HISTORY_PATH, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2)


def add_entry(entry: dict) -> list:
    history = load_history()

    history = [
        h for h in history if h.get('url') != entry.get('url')
    ]

    entry['watched_at'] = datetime.now().isoformat()
    history.insert(0, entry)

    if len(history) > MAX_HISTORY:
        history = history[:MAX_HISTORY]

    save_history(history)
    return history


def clear_history() -> list:
    save_history([])
    return []


def update_position(url: str, position: float, speed: float = 1.0):
    history = load_history()
    for entry in history:
        if entry.get('url') == url:
            entry['last_position'] = position
            entry['playback_speed'] = speed
            entry['watched_at'] = datetime.now().isoformat()
            break
    save_history(history)
    return history

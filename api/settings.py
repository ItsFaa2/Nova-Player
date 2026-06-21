import json
import os

VERCEL = os.environ.get('VERCEL', '') == '1'
DATA_DIR = '/tmp/data' if VERCEL else os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
SETTINGS_PATH = os.path.join(DATA_DIR, 'settings.json')

DEFAULT_SETTINGS = {
    "default_volume": 100,
    "default_speed": 1.0,
    "theme": "dark",
    "auto_resume": True,
    "auto_play": False,
}


def _ensure_file():
    if not os.path.exists(SETTINGS_PATH):
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(SETTINGS_PATH, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_SETTINGS, f, indent=2)


def load_settings() -> dict:
    _ensure_file()
    try:
        with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for key in DEFAULT_SETTINGS:
            if key not in data:
                data[key] = DEFAULT_SETTINGS[key]
        return data
    except (json.JSONDecodeError, FileNotFoundError):
        return dict(DEFAULT_SETTINGS)


def save_settings(settings: dict) -> dict:
    current = load_settings()
    current.update(settings)
    _ensure_file()
    with open(SETTINGS_PATH, 'w', encoding='utf-8') as f:
        json.dump(current, f, indent=2)
    return current

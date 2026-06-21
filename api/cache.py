import json
import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional

VERCEL = os.environ.get('VERCEL', '') == '1'
DATA_DIR = '/tmp/data' if VERCEL else os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
CACHE_PATH = os.path.join(DATA_DIR, 'cache.json')

CACHE_TTL_HOURS = 24


def _ensure_file():
    if not os.path.exists(CACHE_PATH):
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(CACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump({}, f)


def _cache_key(url: str) -> str:
    return hashlib.md5(url.encode('utf-8')).hexdigest()


def load_cache() -> dict:
    _ensure_file()
    try:
        with open(CACHE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return {}
        return data
    except (json.JSONDecodeError, FileNotFoundError):
        return {}


def save_cache(cache: dict):
    _ensure_file()
    with open(CACHE_PATH, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2)


def get_cached(url: str) -> Optional[dict]:
    cache = load_cache()
    key = _cache_key(url)
    entry = cache.get(key)
    if not entry:
        return None

    cached_time = datetime.fromisoformat(entry.get('cached_at', '2000-01-01T00:00:00'))
    if datetime.now() - cached_time > timedelta(hours=CACHE_TTL_HOURS):
        del cache[key]
        save_cache(cache)
        return None

    return entry.get('data')


def set_cache(url: str, data: dict):
    cache = load_cache()
    key = _cache_key(url)
    cache[key] = {
        'cached_at': datetime.now().isoformat(),
        'data': data
    }
    save_cache(cache)


def clear_cache():
    save_cache({})

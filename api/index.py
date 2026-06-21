import sys
import os
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from extractor import extract_video_info
from history import load_history, add_entry, clear_history, update_position
from settings import load_settings, save_settings
from cache import get_cached, set_cache, clear_cache
from validators import is_valid_url, is_supported_url

app = FastAPI(title="NOVA PLAYER", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def restore_path(request: Request, call_next):
    path = request.query_params.get("__path")
    if path is not None:
        restored = "/" + path
        request.scope["path"] = restored
        qs = request.scope.get("query_string", b"").decode()
        cleaned = "&".join(
            p for p in qs.split("&") if not p.startswith("__path=")
        )
        request.scope["query_string"] = cleaned.encode()
    return await call_next(request)


class ExtractRequest(BaseModel):
    url: str


class HistorySaveRequest(BaseModel):
    url: str
    title: str
    duration: float = 0
    thumbnail: str = ''
    last_position: float = 0
    playback_speed: float = 1.0


class HistoryPositionRequest(BaseModel):
    url: str
    position: float
    speed: float = 1.0


class SettingsRequest(BaseModel):
    default_volume: Optional[int] = None
    default_speed: Optional[float] = None
    theme: Optional[str] = None
    auto_resume: Optional[bool] = None
    auto_play: Optional[bool] = None


@app.get('/api/status')
def get_status():
    return {
        'status': 'ok',
        'app': 'NOVA PLAYER',
        'version': '1.0.0'
    }


@app.post('/api/extract')
def extract_video(req: ExtractRequest):
    url = req.url.strip()

    if not is_valid_url(url):
        return {'error': 'Invalid URL format'}

    if not is_supported_url(url):
        return {'error': 'URL not supported by yt-dlp'}

    cached = get_cached(url)
    if cached:
        return cached

    result = extract_video_info(url)

    if 'error' in result:
        return result

    set_cache(url, result)
    return result


@app.post('/api/history/save')
def save_history_entry(req: HistorySaveRequest):
    entry = {
        'url': req.url,
        'title': req.title,
        'duration': req.duration,
        'thumbnail': req.thumbnail,
        'last_position': req.last_position,
        'playback_speed': req.playback_speed,
    }
    history = add_entry(entry)
    return {'history': history}


@app.get('/api/history')
def get_history():
    history = load_history()
    return {'history': history}


@app.delete('/api/history')
def delete_history():
    clear_history()
    return {'history': []}


@app.post('/api/history/position')
def update_history_position(req: HistoryPositionRequest):
    update_position(req.url, req.position, req.speed)
    return {'status': 'ok'}


@app.get('/api/settings')
def get_settings():
    return load_settings()


@app.post('/api/settings')
def update_settings(req: SettingsRequest):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    settings = save_settings(updates)
    return settings


@app.post('/api/cache/clear')
def clear_cache_endpoint():
    clear_cache()
    return {'status': 'ok'}


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app.mount("/", StaticFiles(directory=ROOT, html=True), name="static")

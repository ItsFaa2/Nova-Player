import re

URL_REGEX = re.compile(
    r'^https?://'
    r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?'
    r'|localhost'
    r'|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
    r'(?::\d+)?'
    r'(?:/?|[/?]\S+)$',
    re.IGNORECASE
)

SUPPORTED_DOMAINS = [
    'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
    'vimeo.com', 'www.vimeo.com',
    'dailymotion.com', 'www.dailymotion.com',
    'twitch.tv', 'www.twitch.tv',
    'facebook.com', 'www.facebook.com', 'fb.com',
    'instagram.com', 'www.instagram.com',
    'twitter.com', 'www.twitter.com', 'x.com',
    'tiktok.com', 'www.tiktok.com',
    'reddit.com', 'www.reddit.com',
    'soundcloud.com', 'www.soundcloud.com',
    'bandcamp.com', 'www.bandcamp.com',
    'bilibili.com', 'www.bilibili.com',
    'nicovideo.jp',
    'rumble.com', 'www.rumble.com',
    'odysee.com', 'www.odysee.com',
    'xhamster.com', 'www.xhamster.com', 'xhamster.desi', 'xhamster2.com',
]


def is_valid_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    return bool(URL_REGEX.match(url.strip()))


def is_supported_url(url: str) -> bool:
    url_lower = url.strip().lower()
    for domain in SUPPORTED_DOMAINS:
        if domain in url_lower:
            return True
    return False

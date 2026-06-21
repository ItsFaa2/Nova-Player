import os
import tempfile

from yt_dlp import YoutubeDL


def _get_cookie_path() -> str | None:
    tmp = tempfile.gettempdir()
    target = os.path.join(tmp, 'yt_cookies.txt')

    env_cookies = os.environ.get('YT_COOKIES', '')
    if env_cookies:
        with open(target, 'w', encoding='utf-8') as f:
            f.write(env_cookies)
        return target

    for candidate in ['data/cookies.txt', 'cookies.txt']:
        if os.path.exists(candidate):
            with open(candidate, 'r', encoding='utf-8') as src:
                with open(target, 'w', encoding='utf-8') as dst:
                    dst.write(src.read())
            return target

    return None


def extract_video_info(url: str) -> dict:
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'no_download': True,
            'skip_download': True,
            'no_playlist': True,
            'flat_playlist': True,
            'check_formats': False,
        }

        cookie_path = _get_cookie_path()
        if cookie_path:
            ydl_opts['cookiefile'] = cookie_path

        with YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False, process=False)
            except Exception as e:
                msg = str(e)
                if 'Unsupported URL' in msg or 'unsupported' in msg.lower():
                    return {'error': f'Unsupported URL: {url}'}
                if 'Video unavailable' in msg or 'private' in msg.lower():
                    return {'error': 'Video unavailable'}
                return {'error': msg[:500]}

        if not info:
            return {'error': 'No data returned from yt-dlp'}

        formats = []
        seen_formats = set()
        for fmt in info.get('formats', []):
            fmt_id = fmt.get('format_id', '')
            if fmt_id in seen_formats:
                continue
            seen_formats.add(fmt_id)

            ext = fmt.get('ext', '')
            fmt_url = fmt.get('url', '')
            if not fmt_url:
                continue

            format_note = fmt.get('format_note', '')
            vcodec = fmt.get('vcodec', 'none')
            acodec = fmt.get('acodec', 'none')
            height = fmt.get('height') or 0
            filesize = fmt.get('filesize') or fmt.get('filesize_approx') or 0

            has_video = vcodec != 'none'
            has_audio = acodec != 'none'

            format_type = 'video+audio'
            if has_video and has_audio:
                format_type = 'video+audio'
            elif has_video:
                format_type = 'video'
            elif has_audio:
                format_type = 'audio'

            label_parts = []
            if height and has_video:
                label_parts.append(f'{height}p')
            if format_note and has_video:
                if format_note not in ['tiny', 'small', 'medium', 'large', 'hd', 'fullhd', 'ultrahd']:
                    label_parts.append(format_note)
            if not label_parts:
                label_parts.append(ext.upper())

            formats.append({
                'format_id': fmt_id,
                'ext': ext,
                'height': height,
                'filesize': filesize,
                'format_note': format_note,
                'vcodec': vcodec,
                'acodec': acodec,
                'type': format_type,
                'url': fmt_url,
                'label': ' '.join(label_parts),
            })

        thumbnails = info.get('thumbnails', [])
        thumbnail = ''
        if thumbnails:
            thumbs_by_res = sorted(
                [t for t in thumbnails if t.get('url')],
                key=lambda t: t.get('height', 0) or t.get('width', 0) or 0,
                reverse=True
            )
            if thumbs_by_res:
                thumbnail = thumbs_by_res[0].get('url', '')
        if not thumbnail:
            thumbnail = info.get('thumbnail', '')

        duration = info.get('duration') or 0

        return {
            'title': info.get('title', 'Unknown Title'),
            'uploader': info.get('uploader', info.get('channel', 'Unknown')),
            'duration': duration,
            'thumbnail': thumbnail,
            'webpage_url': info.get('webpage_url', url),
            'description': (info.get('description') or '')[:500],
            'upload_date': info.get('upload_date', ''),
            'view_count': info.get('view_count', 0),
            'like_count': info.get('like_count', 0),
            'formats': formats,
        }

    except Exception as e:
        return {'error': f'Extraction failed: {str(e)}'}

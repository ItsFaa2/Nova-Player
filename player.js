const API_BASE = '';

const videoPlayer = document.getElementById('videoPlayer');
const thumbnailOverlay = document.getElementById('thumbnailOverlay');
const thumbnailImg = document.getElementById('thumbnailImg');
const bigPlayBtn = document.getElementById('bigPlayBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const videoTitle = document.getElementById('videoTitle');
const uploaderInfo = document.getElementById('uploaderInfo');
const durationInfo = document.getElementById('durationInfo');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const seekBar = document.getElementById('seekBar');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const rewindBtn = document.getElementById('rewindBtn');
const forwardBtn = document.getElementById('forwardBtn');
const volumeBtn = document.getElementById('volumeBtn');
const volumeIcon = document.getElementById('volumeIcon');
const volumeSlider = document.getElementById('volumeSlider');
const volumeLabel = document.getElementById('volumeLabel');
const speedSelect = document.getElementById('speedSelect');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const fullscreenIcon = document.getElementById('fullscreenIcon');
const pipBtn = document.getElementById('pipBtn');
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const settingsSave = document.getElementById('settingsSave');

let videoData = null;
let videoUrl = null;
let isPlaying = false;
let isSeeking = false;

async function init() {
  try {
    const stored = localStorage.getItem('novaPlayerData');
    videoUrl = localStorage.getItem('novaPlayerUrl');
    if (stored) videoData = JSON.parse(stored);
  } catch {
    // ignore
  }

  if (!videoData) {
    videoTitle.textContent = 'No video data';
    return;
  }

  videoTitle.textContent = videoData.title || 'Unknown Title';
  uploaderInfo.textContent = videoData.uploader || '';

  if (videoData.duration) {
    durationInfo.textContent = formatDuration(videoData.duration);
    totalTimeEl.textContent = formatDuration(videoData.duration);
  }

  if (videoData.thumbnail) {
    thumbnailImg.src = videoData.thumbnail;
  }

  await loadSettings();
  loadStreamUrl();
}

async function loadStreamUrl() {
  if (!videoData.formats || videoData.formats.length === 0) {
    if (videoUrl) {
      setErrorState('No playable formats found. Try another URL.');
    }
    return;
  }

  let selectedFormat = null;

  const videoFormats = videoData.formats.filter(
    (f) => f.type === 'video+audio' && f.url
  );

  if (videoFormats.length > 0) {
    selectedFormat = videoFormats
      .filter((f) => f.height)
      .sort((a, b) => b.height - a.height)[0]
      || videoFormats[0];
  }

  if (!selectedFormat) {
    const anyFormats = videoData.formats.filter((f) => f.url);
    if (anyFormats.length > 0) {
      selectedFormat = anyFormats[0];
    }
  }

  if (!selectedFormat || !selectedFormat.url) {
    setErrorState('No stream URL available.');
    return;
  }

  const streamUrl = selectedFormat.url;

  videoPlayer.src = streamUrl;
  videoPlayer.load();

  if (videoData.thumbnail) {
    thumbnailImg.src = videoData.thumbnail;
  }

  attachPlayerEvents();
}

function setErrorState(msg) {
  videoTitle.textContent = msg || 'Error loading video';
  loadingIndicator.classList.add('hidden');
  thumbnailOverlay.classList.remove('hidden');
  bigPlayBtn.style.display = 'none';
}

function attachPlayerEvents() {
  videoPlayer.addEventListener('loadedmetadata', onMetadataLoaded);
  videoPlayer.addEventListener('timeupdate', onTimeUpdate);
  videoPlayer.addEventListener('play', onPlay);
  videoPlayer.addEventListener('pause', onPause);
  videoPlayer.addEventListener('waiting', onWaiting);
  videoPlayer.addEventListener('canplay', onCanPlay);
  videoPlayer.addEventListener('ended', onEnded);
  videoPlayer.addEventListener('error', onVideoError);

  bigPlayBtn.addEventListener('click', startPlayback);
  thumbnailOverlay.addEventListener('click', startPlayback);

  playBtn.addEventListener('click', togglePlay);
  rewindBtn.addEventListener('click', () => skip(-5));
  forwardBtn.addEventListener('click', () => skip(5));

  seekBar.addEventListener('input', onSeekInput);
  seekBar.addEventListener('change', onSeekChange);

  volumeSlider.addEventListener('input', onVolumeInput);
  volumeBtn.addEventListener('click', toggleMute);

  speedSelect.addEventListener('change', onSpeedChange);

  fullscreenBtn.addEventListener('click', toggleFullscreen);
  pipBtn.addEventListener('click', togglePiP);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  settingsToggle.addEventListener('click', toggleSettings);
  settingsSave.addEventListener('click', saveSettingsUI);
}

function onMetadataLoaded() {
  const dur = videoPlayer.duration || videoData.duration || 0;
  if (dur) {
    totalTimeEl.textContent = formatDuration(dur);
    durationInfo.textContent = formatDuration(dur);
  }

  if (videoData.last_position && videoData.last_position > 0) {
    videoPlayer.currentTime = videoData.last_position;
  }

  if (videoData.playback_speed && videoData.playback_speed !== 1) {
    videoPlayer.playbackRate = videoData.playback_speed;
    speedSelect.value = String(videoData.playback_speed);
  }

  const settings = getCachedSettings();
  if (settings) {
    if (settings.default_volume !== undefined) {
      const vol = Math.max(0, Math.min(100, settings.default_volume));
      volumeSlider.value = String(vol);
      videoPlayer.volume = vol / 100;
      videoPlayer.muted = vol === 0;
      updateVolumeUI(vol);
    }
    if (settings.auto_play) {
      startPlayback();
    }
  }
}

function startPlayback() {
  thumbnailOverlay.classList.add('hidden');
  videoPlayer.play().catch(() => {});
}

function onPlay() {
  isPlaying = true;
  playIcon.innerHTML = '&#10074;&#10074;';
  thumbnailOverlay.classList.add('hidden');
  loadingIndicator.classList.add('hidden');
}

function onPause() {
  isPlaying = false;
  playIcon.innerHTML = '&#9654;';
}

function onWaiting() {
  if (isPlaying) {
    loadingIndicator.classList.remove('hidden');
  }
}

function onCanPlay() {
  loadingIndicator.classList.add('hidden');
}

function onEnded() {
  isPlaying = false;
  playIcon.innerHTML = '&#9654;';
  savePosition();
}

function onVideoError() {
  loadingIndicator.classList.add('hidden');
  setErrorState('Video playback error. Try a different format.');
}

function togglePlay() {
  if (thumbnailOverlay && !thumbnailOverlay.classList.contains('hidden')) {
    startPlayback();
    return;
  }

  if (videoPlayer.paused) {
    videoPlayer.play().catch(() => {});
  } else {
    videoPlayer.pause();
  }
}

function skip(seconds) {
  videoPlayer.currentTime = Math.max(
    0,
    Math.min(videoPlayer.currentTime + seconds, videoPlayer.duration || 0)
  );
}

function onSeekInput() {
  isSeeking = true;
  const dur = videoPlayer.duration || videoData.duration || 1;
  const pct = parseFloat(seekBar.value) / 1000;
  currentTimeEl.textContent = formatDuration(pct * dur);
}

function onSeekChange() {
  const dur = videoPlayer.duration || videoData.duration || 1;
  const pct = parseFloat(seekBar.value) / 1000;
  videoPlayer.currentTime = pct * dur;
  isSeeking = false;
}

function onTimeUpdate() {
  if (isSeeking) return;
  const dur = videoPlayer.duration || videoData.duration || 1;
  const ct = videoPlayer.currentTime;
  const pct = Math.min(ct / dur, 1) * 1000;

  if (isFinite(pct)) {
    seekBar.value = String(pct);
  }
  currentTimeEl.textContent = formatDuration(ct);
}

function onVolumeInput() {
  const vol = parseInt(volumeSlider.value, 10);
  videoPlayer.volume = vol / 100;
  videoPlayer.muted = vol === 0;
  updateVolumeUI(vol);
}

function toggleMute() {
  videoPlayer.muted = !videoPlayer.muted;
  const vol = videoPlayer.muted ? 0 : Math.round(videoPlayer.volume * 100);
  volumeSlider.value = String(vol);
  updateVolumeUI(vol);
}

function updateVolumeUI(vol) {
  volumeLabel.textContent = `${vol}%`;
  if (vol === 0 || videoPlayer.muted) {
    volumeIcon.innerHTML = '&#128263;';
  } else if (vol < 50) {
    volumeIcon.innerHTML = '&#128265;';
  } else {
    volumeIcon.innerHTML = '&#128266;';
  }
}

function onSpeedChange() {
  const speed = parseFloat(speedSelect.value);
  videoPlayer.playbackRate = speed;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const el = document.querySelector('.video-wrapper') || document.body;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

function onFullscreenChange() {
  const isFs = !!document.fullscreenElement;
  fullscreenIcon.innerHTML = isFs ? '&#9212;' : '&#9974;';
}

async function togglePiP() {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await videoPlayer.requestPictureInPicture();
    }
  } catch {
    // PiP not supported
  }
}

function onKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      skip(-5);
      break;
    case 'ArrowRight':
      e.preventDefault();
      skip(5);
      break;
    case 'ArrowUp':
      e.preventDefault();
      adjustVolume(5);
      break;
    case 'ArrowDown':
      e.preventDefault();
      adjustVolume(-5);
      break;
    case 'KeyM':
      toggleMute();
      break;
    case 'KeyF':
      toggleFullscreen();
      break;
    case 'KeyP':
      togglePiP();
      break;
  }
}

function adjustVolume(delta) {
  let vol = Math.round(parseInt(volumeSlider.value, 10) + delta);
  vol = Math.max(0, Math.min(100, vol));
  volumeSlider.value = String(vol);
  videoPlayer.volume = vol / 100;
  videoPlayer.muted = vol === 0;
  updateVolumeUI(vol);
}

function toggleSettings() {
  settingsPanel.classList.toggle('hidden');
}

function saveSettingsUI() {
  const settings = {
    default_volume: parseInt(document.getElementById('settingVolume').value, 10),
    default_speed: parseFloat(document.getElementById('settingSpeed').value),
    auto_resume: document.getElementById('settingAutoResume').checked,
    auto_play: document.getElementById('settingAutoPlay').checked,
  };

  fetch(`${API_BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }).catch(() => {});

  settingsPanel.classList.add('hidden');
  loadSettings();
}

async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/settings`);
    const settings = await res.json();

    document.getElementById('settingVolume').value = settings.default_volume || 100;
    document.getElementById('settingVolumeLabel').textContent = `${settings.default_volume || 100}%`;
    document.getElementById('settingSpeed').value = String(settings.default_speed || 1.0);
    document.getElementById('settingAutoResume').checked = settings.auto_resume !== false;
    document.getElementById('settingAutoPlay').checked = settings.auto_play === true;

    localStorage.setItem('novaSettings', JSON.stringify(settings));

    if (!videoPlayer.src) {
      const vol = settings.default_volume !== undefined ? settings.default_volume : 100;
      volumeSlider.value = String(vol);
      videoPlayer.volume = vol / 100;
      updateVolumeUI(vol);
    }
  } catch {
    // use defaults
  }
}

function getCachedSettings() {
  try {
    const s = localStorage.getItem('novaSettings');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

async function savePosition() {
  if (!videoUrl) return;

  try {
    await fetch(`${API_BASE}/api/history/position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: videoUrl,
        position: videoPlayer.currentTime || 0,
        speed: videoPlayer.playbackRate || 1.0,
      }),
    });
  } catch {
    // silently fail
  }
}

async function saveToHistory() {
  if (!videoUrl || !videoData) return;

  try {
    await fetch(`${API_BASE}/api/history/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: videoUrl,
        title: videoData.title || 'Unknown',
        duration: videoData.duration || 0,
        thumbnail: videoData.thumbnail || '',
        last_position: videoPlayer.currentTime || 0,
        playback_speed: videoPlayer.playbackRate || 1.0,
      }),
    });
  } catch {
    // silently fail
  }
}

window.addEventListener('beforeunload', () => {
  saveToHistory();
});

const positionInterval = setInterval(() => {
  if (isPlaying && videoPlayer.currentTime > 0) {
    savePosition();
  }
}, 5000);

function formatDuration(seconds) {
  if (!seconds || seconds < 0 || !isFinite(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

init();

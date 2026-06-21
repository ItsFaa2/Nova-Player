const API_BASE = '';

const urlInput = document.getElementById('urlInput');
const playBtn = document.getElementById('playBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingOverlay = document.getElementById('loadingOverlay');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

let isExtracting = false;

playBtn.addEventListener('click', handlePlay);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handlePlay();
});

async function handlePlay() {
  if (isExtracting) return;

  const url = urlInput.value.trim();
  if (!url) {
    showError('Please enter a video URL');
    return;
  }

  hideError();
  showLoading();

  isExtracting = true;
  playBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (data.error) {
      showError(data.error);
      hideLoading();
      return;
    }

    localStorage.setItem('novaPlayerData', JSON.stringify(data));
    localStorage.setItem('novaPlayerUrl', url);
    window.location.href = 'player.html';
  } catch (err) {
    showError('Network error. Make sure the server is running.');
    hideLoading();
  } finally {
    isExtracting = false;
    playBtn.disabled = false;
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
  errorMessage.textContent = '';
}

function showLoading() {
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/history`);
    const data = await res.json();
    renderHistory(data.history || []);
  } catch {
    renderHistory([]);
  }
}

function renderHistory(history) {
  historyList.innerHTML = '';

  if (!history || history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-history">
        <span class="empty-icon">&#9654;</span>
        <p>No videos yet. Paste a URL above to start.</p>
      </div>
    `;
    clearHistoryBtn.classList.add('hidden');
    return;
  }

  clearHistoryBtn.classList.remove('hidden');

  history.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.addEventListener('click', () => navigateToPlayer(entry));

    const duration = entry.duration ? formatDuration(entry.duration) : '';
    const watchedAt = entry.watched_at
      ? new Date(entry.watched_at).toLocaleDateString()
      : '';

    item.innerHTML = `
      <img
        class="history-thumb"
        src="${entry.thumbnail || ''}"
        alt=""
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2268%22><rect fill=%22%2312121e%22 width=%22120%22 height=%2268%22/></svg>'"
      >
      <div class="history-info">
        <div class="history-title">${escapeHtml(entry.title || 'Unknown')}</div>
        <div class="history-meta">
          ${duration ? duration + ' &middot; ' : ''}${watchedAt}
          ${entry.last_position ? `<span class="history-resume"> &middot; Resume</span>` : ''}
        </div>
      </div>
    `;

    historyList.appendChild(item);
  });
}

function navigateToPlayer(entry) {
  const videoData = {
    title: entry.title,
    uploader: entry.uploader || '',
    duration: entry.duration || 0,
    thumbnail: entry.thumbnail || '',
    last_position: entry.last_position || 0,
    playback_speed: entry.playback_speed || 1.0,
    url: entry.url,
  };
  localStorage.setItem('novaPlayerData', JSON.stringify(videoData));
  localStorage.setItem('novaPlayerUrl', entry.url);
  window.location.href = 'player.html';
}

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

clearHistoryBtn.addEventListener('click', async () => {
  try {
    await fetch(`${API_BASE}/api/history`, { method: 'DELETE' });
    renderHistory([]);
  } catch {
    // silently fail
  }
});

loadHistory();

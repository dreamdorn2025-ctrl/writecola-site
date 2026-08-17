/**
 * WriteCola Tutorials Hub Script
 * - Dynamic Video Lessons Catalog
 * - Instant Live Search & Category Filtering
 * - Watched Progress Tracking with LocalStorage
 * - Universal Modal Video Player (YouTube, Rutube, VK, Vimeo, MP4)
 * - Clickable Timestamps
 */

let allTutorials = [];
let activeCategory = 'all';
let searchQuery = '';
let watchedTutorialIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
  initWatchedStorage();
  initSearch();
  initCategoryFilters();
  initModalEvents();
  loadTutorialsData();
});

/* LocalStorage for Watched Tutorials */
function initWatchedStorage() {
  try {
    const saved = localStorage.getItem('writecola_watched_tutorials');
    if (saved) {
      watchedTutorialIds = new Set(JSON.parse(saved));
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

function saveWatchedStorage() {
  try {
    localStorage.setItem('writecola_watched_tutorials', JSON.stringify([...watchedTutorialIds]));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

function toggleWatched(id, e) {
  if (e) e.stopPropagation();
  if (watchedTutorialIds.has(id)) {
    watchedTutorialIds.delete(id);
  } else {
    watchedTutorialIds.add(id);
  }
  saveWatchedStorage();
  renderTutorials();
  updateWatchedStats();
}

/* Load Data */
async function loadTutorialsData() {
  try {
    const res = await fetch('content/site-content.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Data file not found');
    const data = await res.json();
    allTutorials = data.tutorials || data.guides || [];

    // Check URL parameters (e.g. ?id=branches-and-commits or ?category=versioning)
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('category');
    const idParam = urlParams.get('id');

    if (catParam) {
      activeCategory = catParam;
      updateFilterPillActiveState();
    }

    renderTutorials();
    updateWatchedStats();

    if (idParam) {
      const match = allTutorials.find(t => t.id === idParam);
      if (match) {
        setTimeout(() => openVideoModal(match), 200);
      }
    }

  } catch (err) {
    console.error('Error loading tutorials:', err);
    document.getElementById('tutorials-grid').innerHTML = `
      <div class="tutorials-empty">
        <h3>Не удалось загрузить список уроков</h3>
        <p>Проверьте соединение или наличие файла content/site-content.json.</p>
      </div>
    `;
  }
}

/* Search Handling */
function initSearch() {
  const searchInput = document.getElementById('tutorial-search-input');
  const clearBtn = document.getElementById('clear-search-btn');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    if (clearBtn) {
      clearBtn.style.display = searchQuery ? 'block' : 'none';
    }
    renderTutorials();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearBtn.style.display = 'none';
      renderTutorials();
      searchInput.focus();
    });
  }
}

/* Category Filter Tabs */
function initCategoryFilters() {
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category') || 'all';
      renderTutorials();
    });
  });
}

function updateFilterPillActiveState() {
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(pill => {
    if (pill.getAttribute('data-category') === activeCategory) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

/* Update Watched Counter */
function updateWatchedStats() {
  const statsBadge = document.getElementById('watched-stats-text');
  const totalCountEl = document.getElementById('total-tutorials-count');
  if (totalCountEl) {
    totalCountEl.textContent = allTutorials.length;
  }
  if (statsBadge) {
    const watchedCount = allTutorials.filter(t => watchedTutorialIds.has(t.id)).length;
    statsBadge.textContent = `${watchedCount} из ${allTutorials.length} просмотрено`;
  }
}

/* Filter & Render */
function renderTutorials() {
  const grid = document.getElementById('tutorials-grid');
  const empty = document.getElementById('tutorials-empty');
  if (!grid) return;

  let filtered = allTutorials.filter(item => {
    // Category match
    if (activeCategory !== 'all' && item.category !== activeCategory) {
      return false;
    }
    // Search match
    if (searchQuery) {
      const titleMatch = (item.title || '').toLowerCase().includes(searchQuery);
      const descMatch = (item.description || '').toLowerCase().includes(searchQuery);
      const catMatch = (item.categoryLabel || '').toLowerCase().includes(searchQuery);
      return titleMatch || descMatch || catMatch;
    }
    return true;
  });

  if (!filtered.length) {
    grid.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;

  grid.innerHTML = filtered.map(item => {
    const isWatched = watchedTutorialIds.has(item.id);
    const timestamps = item.timestamps || [];

    return `
      <article class="video-card ${isWatched ? 'watched' : ''}" id="tutorial-${item.id}">
        <div class="video-card-thumb" onclick="openVideoModalById('${item.id}')">
          <img src="${item.image || 'content/media/guide-placeholder-1.svg'}" alt="${escapeHtml(item.title)}" loading="lazy" />
          <div class="video-play-overlay">
            <div class="play-circle">
              <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
          </div>
          ${item.duration ? `<span class="video-duration">${item.duration}</span>` : ''}
          ${item.level ? `<span class="video-level-tag level-${item.level === 'Продвинутый' ? 'pro' : 'basic'}">${item.level}</span>` : ''}
        </div>

        <div class="video-card-body">
          <div class="video-category-label">${escapeHtml(item.categoryLabel || 'Видеоурок')}</div>
          <h3 class="video-card-title" onclick="openVideoModalById('${item.id}')">${escapeHtml(item.title)}</h3>
          <p class="video-card-desc">${escapeHtml(item.description || '')}</p>

          ${timestamps.length > 0 ? `
            <div class="video-timestamps">
              <div class="timestamps-toggle">
                <span>Главы урока (${timestamps.length})</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
              </div>
              <ul class="timestamps-list">
                ${timestamps.slice(0, 3).map(ts => `
                  <li class="timestamp-item" onclick="openVideoModalById('${item.id}', '${ts.time}')">
                    <span class="timestamp-time">${ts.time}</span>
                    <span>${escapeHtml(ts.title)}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="video-card-footer">
            <button class="watch-btn" onclick="openVideoModalById('${item.id}')">
              Смотреть
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>

            <button class="mark-watched-btn" onclick="toggleWatched('${item.id}', event)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                ${isWatched ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="9"></circle>'}
              </svg>
              ${isWatched ? 'Просмотрен' : 'Отметить'}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/* Modal Player Logic */
function initModalEvents() {
  const modal = document.getElementById('video-modal');
  const closeBtn = document.getElementById('video-modal-close');
  if (!modal) return;

  if (closeBtn) {
    closeBtn.addEventListener('click', closeVideoModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeVideoModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeVideoModal();
    }
  });
}

function openVideoModalById(id, startTimeStr = null) {
  const item = allTutorials.find(t => t.id === id);
  if (item) {
    openVideoModal(item, startTimeStr);
  }
}

function openVideoModal(item, startTimeStr = null) {
  const modal = document.getElementById('video-modal');
  const playerWrap = document.getElementById('video-modal-player-wrap');
  const titleEl = document.getElementById('video-modal-title');
  const footerEl = document.getElementById('video-modal-footer-content');
  if (!modal || !playerWrap) return;

  let startSec = 0;
  if (startTimeStr) {
    const parts = startTimeStr.split(':').map(Number);
    if (parts.length === 2) startSec = parts[0] * 60 + parts[1];
    else if (parts.length === 3) startSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  const embedUrl = toEmbedUrl(item.videoUrl || '', startSec);

  if (embedUrl.endsWith('.mp4')) {
    playerWrap.innerHTML = `<video src="${embedUrl}" controls autoplay></video>`;
  } else {
    playerWrap.innerHTML = `
      <iframe 
        src="${embedUrl}" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
  }

  if (titleEl) {
    titleEl.textContent = item.title;
  }

  if (footerEl) {
    const timestamps = item.timestamps || [];
    if (timestamps.length) {
      footerEl.innerHTML = `
        <div class="modal-timestamps-row">
          <span>Главы:</span>
          ${timestamps.map(ts => `
            <button class="filter-pill" style="padding: 4px 10px; font-size: 12px;" onclick="seekModalVideo('${item.id}', '${ts.time}')">
              <span style="color: var(--gold-light);">${ts.time}</span> ${escapeHtml(ts.title)}
            </button>
          `).join('')}
        </div>
      `;
    } else {
      footerEl.innerHTML = `<p style="font-size: 13.5px; color: var(--text-mid);">${escapeHtml(item.description || '')}</p>`;
    }
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Mark watched automatically on view or keep toggle
  if (item.id && !watchedTutorialIds.has(item.id)) {
    watchedTutorialIds.add(item.id);
    saveWatchedStorage();
    renderTutorials();
    updateWatchedStats();
  }
}

function seekModalVideo(id, timeStr) {
  openVideoModalById(id, timeStr);
}

function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  const playerWrap = document.getElementById('video-modal-player-wrap');
  if (!modal) return;

  modal.classList.remove('open');
  document.body.style.overflow = '';
  if (playerWrap) {
    playerWrap.innerHTML = ''; // Stop video playback immediately
  }
}

/* Universal Embed URL Converter */
function toEmbedUrl(url, startSec = 0) {
  if (!url) return '';

  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      const vidId = u.searchParams.get('v');
      let embed = `https://www.youtube-nocookie.com/embed/${vidId}?autoplay=1`;
      if (startSec > 0) embed += `&start=${startSec}`;
      return embed;
    }
    if (u.hostname === 'youtu.be') {
      const vidId = u.pathname.replace('/', '');
      let embed = `https://www.youtube-nocookie.com/embed/${vidId}?autoplay=1`;
      if (startSec > 0) embed += `&start=${startSec}`;
      return embed;
    }

    // Rutube
    if (u.hostname.includes('rutube.ru')) {
      const parts = u.pathname.split('/').filter(Boolean);
      const vidId = parts[parts.length - 1];
      let embed = `https://rutube.ru/play/embed/${vidId}/`;
      if (startSec > 0) embed += `?t=${startSec}`;
      return embed;
    }

    // VK Video
    if (u.hostname.includes('vk.com')) {
      return url;
    }

    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const vidId = u.pathname.split('/').filter(Boolean).pop();
      let embed = `https://player.vimeo.com/video/${vidId}?autoplay=1`;
      if (startSec > 0) embed += `#t=${startSec}s`;
      return embed;
    }

    return url;
  } catch (e) {
    return url;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

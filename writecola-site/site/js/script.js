/**
 * WriteCola Homepage Scripts
 * - Content loader
 * - Live Visits & Downloads Counters (Real-time API with offline fallback)
 * - Interactive Story Branch Visualizer
 * - Interactive Writing Sprint Simulator
 * - FAQ Accordion
 * - Mobile Navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  initTopbar();
  initMobileNav();
  initFaq();
  initBranchVisualizer();
  initSprintSimulator();
  initLiveCounters();
  loadSiteData();
});

/* Topbar Scroll Effect */
function initTopbar() {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      topbar.classList.add('scrolled');
    } else {
      topbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* Mobile Nav Drawer */
function initMobileNav() {
  const toggle = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('.topnav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* FAQ Accordion */
function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      items.forEach(i => i.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });
}

/* ==========================================================================
   Live Counters Engine (Visits & Downloads)
   ========================================================================== */

const COUNTER_NAMESPACE = 'writecola_app_prod';
const BASE_VISITS = 1240;
const BASE_DOWNLOADS = 310;

function formatCounterNum(num) {
  return Number(num).toLocaleString('ru-RU');
}

function updateVisitsUI(count) {
  const statEl = document.getElementById('stat-visits-count');
  const footerEl = document.getElementById('footer-visits-count');
  const formatted = formatCounterNum(count);
  if (statEl) statEl.textContent = formatted;
  if (footerEl) footerEl.textContent = formatted;
}

function updateDownloadsUI(count) {
  const statEl = document.getElementById('stat-downloads-count');
  const badgeEl = document.getElementById('dl-counter-badge');
  const footerEl = document.getElementById('footer-downloads-count');
  const formatted = formatCounterNum(count);
  if (statEl) statEl.textContent = formatted;
  if (badgeEl) badgeEl.textContent = `${formatted}+ скачиваний`;
  if (footerEl) footerEl.textContent = formatted;
}

async function initLiveCounters() {
  // 1. Initial cached values
  let cachedVisits = parseInt(localStorage.getItem('writecola_cached_visits') || BASE_VISITS, 10);
  let cachedDownloads = parseInt(localStorage.getItem('writecola_cached_downloads') || BASE_DOWNLOADS, 10);

  updateVisitsUI(cachedVisits);
  updateDownloadsUI(cachedDownloads);

  // 2. Track & Increment Visit
  try {
    // Only increment once per browser session to be accurate
    const sessionKey = 'writecola_session_visited';
    const endpoint = sessionStorage.getItem(sessionKey)
      ? `https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/visits`
      : `https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/visits/up`;

    sessionStorage.setItem(sessionKey, '1');

    const res = await fetch(endpoint, { method: 'GET' });
    if (res.ok) {
      const json = await res.json();
      const totalVisits = (json.count || 0) + BASE_VISITS;
      localStorage.setItem('writecola_cached_visits', totalVisits);
      updateVisitsUI(totalVisits);
    }
  } catch (err) {
    // Fallback offline increment
    cachedVisits++;
    localStorage.setItem('writecola_cached_visits', cachedVisits);
    updateVisitsUI(cachedVisits);
  }

  // 3. Fetch current Downloads count
  try {
    const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/downloads`, { method: 'GET' });
    if (res.ok) {
      const json = await res.json();
      const totalDl = (json.count || 0) + BASE_DOWNLOADS;
      localStorage.setItem('writecola_cached_downloads', totalDl);
      updateDownloadsUI(totalDl);
    }
  } catch (err) {
    // Keep cached
  }

  // 4. Attach download tracker to all download buttons
  const dlButtons = document.querySelectorAll('#main-download-btn, #hero-download-btn, [href*=".7z"], [href*="/releases/"]');
  dlButtons.forEach(btn => {
    btn.addEventListener('click', trackDownloadClick);
  });
}

async function trackDownloadClick() {
  let cachedDownloads = parseInt(localStorage.getItem('writecola_cached_downloads') || BASE_DOWNLOADS, 10) + 1;
  localStorage.setItem('writecola_cached_downloads', cachedDownloads);
  updateDownloadsUI(cachedDownloads);

  try {
    await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/downloads/up`, { method: 'GET' });
  } catch (e) {
    // Ignored, cached counter already updated UI
  }
}

/* Interactive Story Branch Visualizer */
function initBranchVisualizer() {
  const nodes = document.querySelectorAll('.ba-node');
  const infoLabel = document.getElementById('branch-active-label');
  const infoDetails = document.getElementById('branch-active-details');
  if (!nodes.length || !infoLabel) return;

  const nodeData = {
    'root': {
      label: 'Главный ствол (main)',
      desc: 'Глава 1–3: Завязка романа. Основная сюжетная линия.'
    },
    'draft': {
      label: 'Ветка draft-scene-4',
      desc: 'Глава 4: Черновой вариант сцены дуэли. Эксперимент с диалогами.'
    },
    'alt': {
      label: 'Ветка alt-ending-twist',
      desc: 'Глава 4 (Альт): Предательство напарника. Альтернативная концовка.'
    },
    'checkpoint': {
      label: 'Коммит #a7f92e (Ревизия)',
      desc: 'Слияние лучших диалогов из альт. ветки в основной текст.'
    },
    'final': {
      label: 'Релиз: Финальный драфт книги',
      desc: 'Книга готова к публикации. Все ветки сведены, оглавление собрано.'
    }
  };

  nodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      const type = node.getAttribute('data-node-type') || 'root';
      const data = nodeData[type];
      if (data) {
        infoLabel.textContent = data.label;
        if (infoDetails) infoDetails.textContent = data.desc;
      }
    });

    node.addEventListener('click', () => {
      const type = node.getAttribute('data-node-type') || 'root';
      const data = nodeData[type];
      if (data) {
        infoLabel.textContent = data.label;
        if (infoDetails) infoDetails.textContent = data.desc;
      }
    });
  });
}

/* Interactive Sprint Simulator */
function initSprintSimulator() {
  const textarea = document.getElementById('sprint-textarea');
  const timerDisplay = document.getElementById('sprint-timer-val');
  const toggleBtn = document.getElementById('sprint-toggle-btn');
  const wordCountDisplay = document.getElementById('sprint-word-count');
  const speedDisplay = document.getElementById('sprint-speed');
  if (!textarea || !timerDisplay || !toggleBtn) return;

  let timerInterval = null;
  let secondsRemaining = 120;
  let isRunning = false;
  let wordsCount = 0;
  let startTime = null;

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateStats() {
    const text = textarea.value.trim();
    wordsCount = text ? text.split(/\s+/).length : 0;
    if (wordCountDisplay) wordCountDisplay.textContent = wordsCount;

    if (isRunning && startTime) {
      const elapsedMin = (Date.now() - startTime) / 60000;
      if (elapsedMin > 0.05) {
        const wpm = Math.round(wordsCount / elapsedMin);
        if (speedDisplay) speedDisplay.textContent = `${wpm} сл/мин`;
      }
    }
  }

  function startSprint() {
    isRunning = true;
    startTime = Date.now();
    toggleBtn.textContent = 'Остановить';
    toggleBtn.classList.remove('btn-primary');
    toggleBtn.classList.add('btn-secondary');
    textarea.focus();

    timerInterval = setInterval(() => {
      secondsRemaining--;
      timerDisplay.textContent = formatTime(secondsRemaining);

      if (secondsRemaining <= 0) {
        stopSprint();
        alert('🎉 Спринт завершен! Отличная писательская сессия!');
      }
    }, 1000);
  }

  function stopSprint() {
    isRunning = false;
    clearInterval(timerInterval);
    toggleBtn.textContent = 'Начать спринт';
    toggleBtn.classList.remove('btn-secondary');
    toggleBtn.classList.add('btn-primary');
  }

  toggleBtn.addEventListener('click', () => {
    if (isRunning) {
      stopSprint();
    } else {
      if (secondsRemaining <= 0) {
        secondsRemaining = 120;
        timerDisplay.textContent = formatTime(secondsRemaining);
      }
      startSprint();
    }
  });

  textarea.addEventListener('input', () => {
    updateStats();
    if (!isRunning && textarea.value.trim().length > 0 && secondsRemaining === 120) {
      startSprint();
    }
  });
}

/* Load Data & Render Homepage Elements */
async function loadSiteData() {
  try {
    const res = await fetch('content/site-content.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Data file not found');
    const data = await res.json();

    if (data.download) {
      renderDownloadSection(data.download);
    }

    const tutorials = data.tutorials || data.guides || [];
    renderFeaturedTutorials(tutorials);

  } catch (err) {
    console.warn('Fallback content rendered:', err);
  }
}

/* Render Download Info */
function renderDownloadSection(dl) {
  const dlBtn = document.getElementById('main-download-btn');
  const heroDlBtn = document.getElementById('hero-download-btn');
  const dlDesc = document.getElementById('download-desc');
  const dlVersion = document.getElementById('dl-version');
  const dlSize = document.getElementById('dl-size');
  const dlPlatform = document.getElementById('dl-platform');
  const dlReqs = document.getElementById('dl-requirements');
  const heroVersionNote = document.getElementById('hero-version-badge');

  if (dl.url) {
    if (dlBtn) dlBtn.setAttribute('href', dl.url);
    if (heroDlBtn) heroDlBtn.setAttribute('href', dl.url);
  }
  if (dl.version) {
    if (dlVersion) dlVersion.textContent = `v${dl.version}`;
    if (heroVersionNote) heroVersionNote.textContent = `Версия v${dl.version} доступна`;
  }
  if (dl.size && dlSize) dlSize.textContent = dl.size;
  if (dl.platform && dlPlatform) dlPlatform.textContent = dl.platform;
  if (dl.description && dlDesc) dlDesc.textContent = dl.description;
  if (dl.requirements && dlReqs) dlReqs.textContent = dl.requirements;
}

/* Render Featured Tutorials on Homepage */
function renderFeaturedTutorials(tutorials) {
  const container = document.getElementById('featured-tutorials-grid');
  if (!container) return;

  const featured = tutorials.filter(t => t.featured || t.type === 'video').slice(0, 3);
  if (!featured.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = featured.map(item => `
    <article class="video-card">
      <div class="video-card-thumb" onclick="location.href='tutorials.html?id=${item.id || ''}'">
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
        <h3 class="video-card-title" onclick="location.href='tutorials.html?id=${item.id || ''}'">${escapeHtml(item.title)}</h3>
        <p class="video-card-desc">${escapeHtml(item.description || '')}</p>
        <div class="video-card-footer">
          <a href="tutorials.html?id=${item.id || ''}" class="watch-btn">
            Смотреть урок
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </article>
  `).join('');
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

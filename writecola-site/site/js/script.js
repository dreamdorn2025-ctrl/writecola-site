async function loadContent() {
  try {
    const res = await fetch('content/site-content.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('content not found');
    const data = await res.json();
    renderDownload(data.download);
    renderGuides(data.guides || []);
  } catch (err) {
    console.error('Не удалось загрузить content/site-content.json', err);
  }
}

function renderDownload(dl) {
  if (!dl) return;
  const btn = document.getElementById('download-button');
  const desc = document.getElementById('download-desc');
  const version = document.getElementById('dl-version');
  const size = document.getElementById('dl-size');
  const platform = document.getElementById('dl-platform');
  const note = document.getElementById('hero-version-note');

  if (dl.url) btn.setAttribute('href', dl.url);
  if (dl.description) desc.textContent = dl.description;
  if (dl.version) version.textContent = dl.version;
  if (dl.size) size.textContent = dl.size;
  if (dl.platform) platform.textContent = dl.platform;
  if (dl.version) note.textContent = `Актуальная версия — ${dl.version}`;
}

function renderGuides(guides) {
  const grid = document.getElementById('guides-grid');
  const empty = document.getElementById('guides-empty');
  grid.innerHTML = '';

  if (!guides.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const g of guides) {
    const card = document.createElement('article');
    card.className = 'guide-card';

    const media = document.createElement('div');
    media.className = 'guide-media';

    const tag = document.createElement('span');
    tag.className = 'guide-tag';
    tag.textContent = g.type === 'video' ? 'видео' : 'фото';
    media.appendChild(tag);

    if (g.type === 'video' && g.videoUrl) {
      const iframe = document.createElement('iframe');
      iframe.src = toEmbedUrl(g.videoUrl);
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      media.appendChild(iframe);
    } else if (g.image) {
      const img = document.createElement('img');
      img.src = g.image;
      img.alt = g.title || '';
      img.loading = 'lazy';
      media.appendChild(img);
    }

    const body = document.createElement('div');
    body.className = 'guide-body';
    const h3 = document.createElement('h3');
    h3.textContent = g.title || '';
    const p = document.createElement('p');
    p.textContent = g.description || '';
    body.appendChild(h3);
    body.appendChild(p);

    card.appendChild(media);
    card.appendChild(body);
    grid.appendChild(card);
  }
}

// Поддержка обычных ссылок YouTube/Vimeo -> embed
function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}

loadContent();

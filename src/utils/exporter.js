import JSZip from 'jszip';

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getArtistHTML(track) {
  if (Array.isArray(track.artists) && track.artists.length > 0) {
    return track.artists.map(a => {
      const url = a.url || `https://open.spotify.com/search/${encodeURIComponent(a.name)}`;
      return `<a href="${url}" target="_blank" class="artist-link" title="Ouvrir la page de ${a.name} sur Spotify" onclick="event.stopPropagation()">${a.name}</a>`;
    }).join(', ');
  } else if (track.artistUrl) {
    return `<a href="${track.artistUrl}" target="_blank" class="artist-link" title="Ouvrir la page de l'artiste sur Spotify" onclick="event.stopPropagation()">${track.artist}</a>`;
  } else if (track.artist) {
    const artistNames = track.artist.split(', ');
    return artistNames.map(name => {
      const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(name.trim())}`;
      return `<a href="${searchUrl}" target="_blank" class="artist-link" title="Ouvrir la page de ${name.trim()} sur Spotify" onclick="event.stopPropagation()">${name.trim()}</a>`;
    }).join(', ');
  }
  return 'Artiste inconnu';
}

const STATIC_CSS = `/* LE SON DE LA CURIOSITÉ — VERCEL STATIC CSS */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

:root {
  --font-display: 'Syne', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border-radius: 0 !important;
}

[data-theme="dark"] {
  --bg-base: #08090a;
  --bg-surface: #101214;
  --bg-shell: #16191d;
  --bg-hover: #1e2228;
  --bg-card: #0d0f11;
  --text-main: #f0f3f6;
  --text-sub: #9ca3af;
  --text-muted: #6b7280;
  --accent-emerald: #10b981;
  --accent-emerald-glow: rgba(16, 185, 129, 0.25);
  --border-outer: #27272a;
  --border-inner: #18181b;
  --card-shadow: 0 16px 32px rgba(0, 0, 0, 0.6);
  --btn-text: #000000;
  --title-gradient: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
}

[data-theme="light"] {
  --bg-base: #f8fafc;
  --bg-surface: #ffffff;
  --bg-shell: #f1f5f9;
  --bg-hover: #e2e8f0;
  --bg-card: #ffffff;
  --text-main: #0f172a;
  --text-sub: #475569;
  --text-muted: #64748b;
  --accent-emerald: #059669;
  --accent-emerald-glow: rgba(5, 150, 105, 0.2);
  --border-outer: #cbd5e1;
  --border-inner: #e2e8f0;
  --card-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  --btn-text: #ffffff;
  --title-gradient: linear-gradient(135deg, #0f172a 0%, #475569 100%);
}

body {
  font-family: var(--font-body);
  background-color: var(--bg-base);
  color: var(--text-main);
  line-height: 1.5;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 120px;
  transition: background-color 0.4s ease, color 0.4s ease;
}

.site-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem;
}

.site-header { margin-bottom: 2.5rem; }

.nav-island {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-outer);
  box-shadow: var(--card-shadow);
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  text-decoration: none;
  color: var(--text-main);
}

.brand-text { display: flex; flex-direction: column; }

.brand-name {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.brand-sub {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--accent-emerald);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 2px;
}

.header-controls { display: flex; align-items: center; gap: 0.75rem; }

.icon-btn {
  background: var(--bg-shell);
  border: 1px solid var(--border-outer);
  color: var(--text-main);
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s var(--ease-spring);
}

.icon-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-emerald);
  color: var(--accent-emerald);
}

.icon-btn svg { width: 18px; height: 18px; }

.hero-section {
  text-align: center;
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 5.5vw, 4.25rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 0.75rem;
  max-width: 950px;
  margin-left: auto;
  margin-right: auto;
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.4rem;
  flex-wrap: nowrap;
}

.hero-title-text {
  background: var(--title-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-title-external-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-sub);
  -webkit-text-fill-color: initial;
  transition: color 0.3s ease, transform 0.3s var(--ease-spring);
  vertical-align: middle;
  padding: 0.1rem;
  text-decoration: none;
  flex-shrink: 0;
}

.hero-title-external-link:hover {
  color: var(--accent-emerald);
  transform: translate(2px, -2px);
}

.hero-title-external-link svg {
  width: clamp(1.2rem, 2.5vw, 1.8rem);
  height: clamp(1.2rem, 2.5vw, 1.8rem);
}

.hero-description {
  font-size: 1.05rem;
  color: var(--text-sub);
  max-width: 640px;
  margin: 0 auto 1.5rem auto;
  line-height: 1.6;
  font-weight: 400;
  text-align: center;
}

.playlists-catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.playlist-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-outer);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.35s var(--ease-spring);
  text-decoration: none;
  color: inherit;
  box-shadow: var(--card-shadow);
}

.playlist-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-emerald);
  box-shadow: 0 20px 40px var(--accent-emerald-glow);
}

.playlist-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.playlist-card-title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.2;
}

.playlist-track-badge {
  font-family: var(--font-mono);
  font-size: 0.725rem;
  background: var(--bg-shell);
  border: 1px solid var(--border-outer);
  color: var(--accent-emerald);
  padding: 0.25rem 0.6rem;
  font-weight: 500;
}

.playlist-card-desc {
  font-size: 0.925rem;
  color: var(--text-sub);
  line-height: 1.55;
  margin-bottom: 1.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.playlist-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--border-inner);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--accent-emerald);
  font-weight: 500;
}

.playlist-card-footer svg {
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;
}

.playlist-card:hover .playlist-card-footer svg { transform: translateX(4px); }

.tracks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 1.25rem;
  margin-top: 1rem;
}

.song-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-outer);
  padding: 4px;
  transition: all 0.35s var(--ease-spring);
}

.song-card-inner {
  background: var(--bg-card);
  border: 1px solid var(--border-inner);
  padding: 0.85rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.song-card.playing {
  border-color: var(--accent-emerald);
  box-shadow: 0 0 25px var(--accent-emerald-glow);
}

.album-art-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  margin-bottom: 0.85rem;
  overflow: hidden;
  background: var(--bg-shell);
}

.album-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s var(--ease-spring);
}

.song-card:hover .album-art { transform: scale(1.05); }

.play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.album-art-wrapper:hover .play-overlay,
.song-card.playing .play-overlay { opacity: 1; }

.play-card-btn { background: transparent; border: none; cursor: pointer; padding: 0; }

.play-card-btn .btn-icon-bubble {
  width: 52px;
  height: 52px;
  background: var(--accent-emerald);
  border: none;
  color: var(--btn-text);
  box-shadow: 0 8px 24px var(--accent-emerald-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.4s var(--ease-bounce), background 0.3s ease;
}

.play-card-btn:hover .btn-icon-bubble { transform: scale(1.08); background: var(--accent-emerald); }

.spotify-play-combo { position: relative; display: inline-flex; align-items: center; justify-content: center; }
.spotify-play-combo.hover-cover-mode { width: 28px; height: 28px; }
.spotify-play-combo.hover-cover-mode .spotify-svg { width: 24px; height: 24px; color: var(--btn-text); }
.spotify-play-combo.hover-cover-mode .play-badge-overlay {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 14px;
  height: 14px;
  background: var(--bg-base);
  border: 1px solid var(--btn-text);
  color: var(--accent-emerald);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}
.spotify-play-combo.hover-cover-mode .play-badge-overlay svg { width: 8px; height: 8px; margin-left: 1px; }

.song-info { margin-bottom: 0.65rem; }

.song-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.song-title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-main);
}

.spotify-link-icon {
  color: var(--text-muted);
  transition: color 0.3s ease, transform 0.3s var(--ease-spring);
  display: flex;
  align-items: center;
  padding: 0.1rem;
}

.spotify-link-icon:hover { color: var(--accent-emerald); transform: scale(1.15); }
.song-artist { font-size: 0.875rem; color: var(--text-sub); font-weight: 500; margin-bottom: 0.15rem; }

.artist-link {
  color: var(--text-sub);
  text-decoration: none;
  transition: color 0.2s ease, text-decoration 0.2s ease;
}

.artist-link:hover {
  color: var(--accent-emerald);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.song-album { font-family: var(--font-mono); font-size: 0.725rem; color: var(--text-muted); }

.comment-container { margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--border-inner); }
.comment-box { background: var(--bg-shell); border: 1px solid var(--border-outer); padding: 0.65rem 0.75rem; position: relative; }
.comment-label { font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent-emerald); font-weight: 500; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.3rem; }
.comment-text { font-size: 0.825rem; color: var(--text-main); line-height: 1.45; font-style: italic; }

.global-player-dock {
  position: fixed;
  bottom: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2.5rem);
  max-width: 960px;
  background: var(--bg-surface);
  border: 1px solid var(--border-outer);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  transition: transform 0.4s var(--ease-spring), opacity 0.3s ease;
}

.global-player-dock.hidden { transform: translate(-50%, 150%); opacity: 0; pointer-events: none; }
.player-dock-inner { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; gap: 1.25rem; }
.player-track-meta { display: flex; align-items: center; gap: 0.85rem; min-width: 220px; }
.player-art-img { width: 48px; height: 48px; object-fit: cover; border: 1px solid var(--border-inner); }
.player-track-text { display: flex; flex-direction: column; }
.player-track-title { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.player-track-artist { font-size: 0.8rem; color: var(--text-sub); }
.player-controls-group { display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 480px; gap: 0.4rem; }
.player-buttons { display: flex; align-items: center; gap: 1rem; }
.player-btn { background: transparent; border: none; color: var(--text-main); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
.player-btn:hover { color: var(--accent-emerald); }
.player-btn-main { width: 38px; height: 38px; background: var(--accent-emerald); color: var(--btn-text); }
.player-btn-main:hover { transform: scale(1.08); background: var(--accent-emerald); color: var(--btn-text); }
.progress-container { display: flex; align-items: center; gap: 0.6rem; width: 100%; font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); }
.progress-bar-track { flex: 1; height: 4px; background: var(--bg-shell); border: 1px solid var(--border-inner); cursor: pointer; position: relative; }
.progress-bar-fill { height: 100%; background: var(--accent-emerald); width: 0%; }
`;

const STATIC_PLAYER_JS = `(function () {
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    const savedTheme = localStorage.getItem('melomanie_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('melomanie_theme', next);
    });
  }

  let currentAudio = null;
  let currentPlayingTrackId = null;
  let isPlaying = false;

  const globalPlayer = document.getElementById('global-player');
  const playerArt = document.getElementById('player-art');
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playerPlayBtn = document.getElementById('player-play-btn');
  const playerPlayIcon = document.getElementById('player-play-icon');
  const playerPrevBtn = document.getElementById('player-prev-btn');
  const playerNextBtn = document.getElementById('player-next-btn');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressBarTrack = document.getElementById('progress-bar-track');
  const timeCurrent = document.getElementById('time-current');
  const timeDuration = document.getElementById('time-duration');

  const tracks = window.__PLAYLIST_TRACKS__ || [];

  function formatTime(sec) {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return \`\${m}:\${s < 10 ? '0' : ''}\${s}\`;
  }

  async function getTrackAudioUrl(track) {
    if (track.previewUrl && track.previewUrl.trim() !== "") {
      return track.previewUrl;
    }
    try {
      const query = encodeURIComponent(\`\${track.artist} \${track.title}\`);
      const res = await fetch(\`https://itunes.apple.com/search?term=\${query}&entity=song&limit=1\`);
      const data = await res.json();
      if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
        return data.results[0].previewUrl;
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  }

  async function playTrackById(id) {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    if (currentPlayingTrackId === id && currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
        isPlaying = false;
        updateUI(false);
      } else {
        currentAudio.play();
        isPlaying = true;
        updateUI(true);
      }
      return;
    }

    if (currentAudio) currentAudio.pause();
    currentPlayingTrackId = id;
    const audioUrl = await getTrackAudioUrl(track);

    if (audioUrl) {
      currentAudio = new Audio(audioUrl);
      currentAudio.addEventListener('timeupdate', () => {
        if (!currentAudio) return;
        const cur = currentAudio.currentTime;
        const dur = currentAudio.duration || 30;
        const pct = (cur / dur) * 100;
        if (progressBarFill) progressBarFill.style.width = \`\${pct}%\`;
        if (timeCurrent) timeCurrent.textContent = formatTime(cur);
        if (timeDuration) timeDuration.textContent = formatTime(dur);
      });
      currentAudio.addEventListener('ended', playNextTrack);

      try {
        await currentAudio.play();
        isPlaying = true;
      } catch (e) { console.error(e); }
    }
    updateUI(isPlaying, track);
  }

  function updateUI(playing, trackObj) {
    const track = trackObj || tracks.find(t => t.id === currentPlayingTrackId);
    document.querySelectorAll('.song-card').forEach(card => {
      const cardId = card.getAttribute('data-id');
      if (cardId === currentPlayingTrackId && playing) card.classList.add('playing');
      else card.classList.remove('playing');
    });

    if (globalPlayer && track) {
      globalPlayer.classList.remove('hidden');
      if (playerArt) playerArt.src = track.image || '';
      if (playerTitle) playerTitle.textContent = track.title;
      if (playerArtist) playerArtist.textContent = track.artist;
      if (playerPlayIcon) {
        playerPlayIcon.innerHTML = playing
          ? \`<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>\`
          : \`<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>\`;
      }
    }
  }

  function playNextTrack() {
    if (!currentPlayingTrackId || tracks.length === 0) return;
    const idx = tracks.findIndex(t => t.id === currentPlayingTrackId);
    playTrackById(tracks[(idx + 1) % tracks.length].id);
  }

  function playPrevTrack() {
    if (!currentPlayingTrackId || tracks.length === 0) return;
    const idx = tracks.findIndex(t => t.id === currentPlayingTrackId);
    playTrackById(tracks[(idx - 1 + tracks.length) % tracks.length].id);
  }

  document.addEventListener('click', (e) => {
    const playBtn = e.target.closest('.play-card-btn');
    if (playBtn) {
      const id = playBtn.getAttribute('data-id');
      if (id) playTrackById(id);
      return;
    }
    const cardInner = e.target.closest('.song-card-inner');
    if (cardInner && !e.target.closest('a')) {
      const card = e.target.closest('.song-card');
      if (card) {
        const id = card.getAttribute('data-id');
        if (id) playTrackById(id);
      }
    }
  });

  if (playerPlayBtn) playerPlayBtn.addEventListener('click', () => { if (currentPlayingTrackId) playTrackById(currentPlayingTrackId); });
  if (playerNextBtn) playerNextBtn.addEventListener('click', playNextTrack);
  if (playerPrevBtn) playerPrevBtn.addEventListener('click', playPrevTrack);

  if (progressBarTrack) {
    progressBarTrack.addEventListener('click', (e) => {
      if (!currentAudio || !currentAudio.duration) return;
      const rect = progressBarTrack.getBoundingClientRect();
      currentAudio.currentTime = ((e.clientX - rect.left) / rect.width) * currentAudio.duration;
    });
  }
})();`;

export async function exportStudioSiteZIP(playlistsData) {
  const zip = new JSZip();
  const slugs = Object.keys(playlistsData).sort((a, b) => {
    const orderA = typeof playlistsData[a].order === 'number' ? playlistsData[a].order : 999;
    const orderB = typeof playlistsData[b].order === 'number' ? playlistsData[b].order : 999;
    return orderA - orderB;
  });

  if (slugs.length === 0) {
    alert("Aucune playlist à exporter dans le studio.");
    return;
  }

  // Add Assets
  zip.file("assets/style.css", STATIC_CSS);
  zip.file("assets/player.js", STATIC_PLAYER_JS);

  // 1. Generate site/index.html
  const playlistCardsHTML = slugs.map(slug => {
    const pl = playlistsData[slug];
    const trackCount = pl.tracks ? pl.tracks.length : 0;
    const desc = pl.description || "Aucune description fournie.";
    const coverUrl = pl.coverImage || pl.image || (Array.isArray(pl.tracks) && pl.tracks.length > 0 ? pl.tracks[0].image : '');

    const coverHTML = coverUrl
      ? `<div class="playlist-card-cover-wrapper"><img src="${coverUrl}" alt="${escapeHTML(pl.name)}" class="playlist-card-cover-img" loading="lazy"></div>`
      : `<div class="playlist-card-cover-wrapper"><div class="playlist-card-cover-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div></div>`;

    return `
      <a href="playlists/${slug}.html" class="playlist-card group">
        ${coverHTML}
        <div class="playlist-card-body">
          <div>
            <div class="playlist-card-header">
              <h2 class="playlist-card-title">${escapeHTML(pl.name)}</h2>
              <span class="playlist-track-badge">${trackCount} morceaux</span>
            </div>
            <p class="playlist-card-desc">${escapeHTML(desc)}</p>
          </div>
          <div class="playlist-card-footer">
            <span>Découvrir la sélection</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </div>
        </div>
      </a>
    `;
  }).join('\n');

  const homepageHTML = `<!DOCTYPE html>
<html lang="fr" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Le Son de la Curiosité — Audio Curation</title>
  <meta name="description" content="Découvrez nos sélections musicales épurées et nos pépites sonores uniques.">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <div class="site-container">
    <header class="site-header">
      <nav class="nav-island">
        <a href="index.html" class="brand-logo">
          <div class="brand-text">
            <span class="brand-name">Le Son de la Curiosité</span>
            <span class="brand-sub">Audio Curation</span>
          </div>
        </a>
        <div class="header-controls">
          <button id="theme-toggle-btn" class="icon-btn" title="Changer le thème">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>
        </div>
      </nav>
    </header>

    <section class="hero-section">
      <h1 class="hero-title">
        <span class="hero-title-text">Le Son de la Curiosité</span>
      </h1>
      <p class="hero-description">
        Explorez nos sélections musicales épurées et commentées.
      </p>
    </section>

    <main>
      <div class="playlists-catalog-grid">
        ${playlistCardsHTML}
      </div>
    </main>
  </div>
  <script src="assets/player.js"></script>
</body>
</html>`;

  zip.file("index.html", homepageHTML);

  // 2. Generate site/playlists/[slug].html FOR EVERY SINGLE PLAYLIST
  const playlistsFolder = zip.folder("playlists");

  slugs.forEach(slug => {
    const pl = playlistsData[slug];
    const tracks = pl.tracks || [];

    const tracksCardsHTML = tracks.map(track => {
      const artistHTML = getArtistHTML(track);
      const commentHTML = track.comment ? `
        <div class="comment-container">
          <div class="comment-box">
            <span class="comment-label">Note du curateur</span>
            <p class="comment-text">${escapeHTML(track.comment)}</p>
          </div>
        </div>
      ` : '';

      return `
        <div class="song-card" data-id="${track.id}">
          <div class="song-card-inner">
            <div class="album-art-wrapper">
              <img class="album-art" src="${escapeHTML(track.image)}" alt="${escapeHTML(track.album)}" loading="lazy">
              <div class="play-overlay">
                <button class="play-card-btn" data-id="${track.id}" title="Écouter le morceau">
                  <span class="btn-icon-bubble">
                    <span class="spotify-play-combo hover-cover-mode">
                      <svg class="spotify-svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.669.47-.745 3.85-.88 7.15-.506 9.818 1.13.296.18.387.563.209.86zm1.224-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.077-1.182-.413.125-.845-.108-.97-.52-.125-.413.108-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.345.366.226.486.705.26 1.07zm.106-2.833C14.382 8.87 8.544 8.677 5.16 9.704c-.52.158-1.066-.144-1.224-.662-.158-.52.143-1.067.662-1.224 3.886-1.18 10.33-.96 14.39 1.45.47.28.623.89.344 1.357-.28.47-.89.622-1.358.344z"/>
                      </svg>
                      <span class="play-badge-overlay">
                        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            </div>
            <div class="song-info">
              <div class="song-title-row">
                <h3 class="song-title">${escapeHTML(track.title)}</h3>
                <a href="${escapeHTML(track.url)}" target="_blank" class="spotify-link-icon" title="Ouvrir sur Spotify">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.669.47-.745 3.85-.88 7.15-.506 9.818 1.13.296.18.387.563.209.86zm1.224-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.077-1.182-.413.125-.845-.108-.97-.52-.125-.413.108-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.345.366.226.486.705.26 1.07zm.106-2.833C14.382 8.87 8.544 8.677 5.16 9.704c-.52.158-1.066-.144-1.224-.662-.158-.52.143-1.067.662-1.224 3.886-1.18 10.33-.96 14.39 1.45.47.28.623.89.344 1.357-.28.47-.89.622-1.358.344z"/></svg>
                </a>
              </div>
              <p class="song-artist">${artistHTML}</p>
              <p class="song-album">${escapeHTML(track.album)}</p>
            </div>
            ${commentHTML}
          </div>
        </div>
      `;
    }).join('\n');

    const playlistPageHTML = `<!DOCTYPE html>
<html lang="fr" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(pl.name)} — Le Son de la Curiosité</title>
  <meta name="description" content="${escapeHTML(pl.description || pl.name)}">
  <link rel="stylesheet" href="../assets/style.css">
  <script>
    window.__PLAYLIST_TRACKS__ = ${JSON.stringify(tracks)};
  </script>
</head>
<body>
  <div class="site-container">
    <header class="site-header">
      <nav class="nav-island">
        <a href="../index.html" class="brand-logo">
          <div class="brand-text">
            <span class="brand-name">Le Son de la Curiosité</span>
            <span class="brand-sub">Audio Curation</span>
          </div>
        </a>
        <div class="header-controls">
          <button id="theme-toggle-btn" class="icon-btn" title="Changer le thème">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>
        </div>
      </nav>
    </header>

    <main>
      <section class="hero-section">
        <h1 class="hero-title">
          <span class="hero-title-text">${escapeHTML(pl.name)}</span>
          <a href="${escapeHTML(pl.spotifyUrl)}" target="_blank" class="hero-title-external-link" title="Écouter la playlist complète sur spotify">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </h1>
        <p class="hero-description">${escapeHTML(pl.description || "Aucune description fournie.")}</p>
      </section>

      <!-- Tracklist Toolbar (Cards / List Selector) -->
      <div class="view-toggle-toolbar">
        <span class="track-count-badge">${tracks.length} morceau${tracks.length > 1 ? 'x' : ''}</span>
        <div class="view-toggle-group">
          <button class="view-toggle-btn active" id="view-mode-grid" data-view="grid" title="Vue Grille de Cartes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Cartes</span>
          </button>
          <button class="view-toggle-btn" id="view-mode-list" data-view="list" title="Vue Liste Compacte">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            <span>Liste</span>
          </button>
        </div>
      </div>

      <div class="tracks-grid" id="tracks-grid">
        ${tracksCardsHTML}
      </div>
    </main>
  </div>

  <!-- Floating Dock Audio Player -->
  <div class="global-player-dock-wrapper">
    <div class="global-player double-bezel-shell hidden" id="global-player">
      <div class="player-inner double-bezel-core" id="player-custom-ui">
        
        <!-- Track Info -->
        <div class="player-track-info" id="player-track-info">
          <div class="player-art-frame">
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Pochette" class="player-art" id="player-art">
            <div class="player-equalizer-bars" id="player-equalizer">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
          <div class="player-metadata">
            <div class="player-title" id="player-title">Titre du morceau</div>
            <div class="player-artist" id="player-artist">Artiste</div>
          </div>
        </div>

        <!-- Controls -->
        <div class="player-controls" id="player-controls">
          <div class="control-buttons">
            <button class="player-btn" id="player-prev-btn" title="Précédent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
            </button>
            <button class="player-btn play-pause group" id="player-play-btn" title="Lire / Pause">
              <span class="play-icon-holder" id="player-play-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </span>
            </button>
            <button class="player-btn" id="player-next-btn" title="Suivant">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
            </button>
          </div>
          <div class="progress-container">
            <span class="time-display" id="time-current">0:00</span>
            <div class="progress-bar-bg" id="progress-bar-bg">
              <div class="progress-bar-fill" id="progress-bar-fill">
                <span class="progress-glow-head"></span>
              </div>
            </div>
            <span class="time-display" id="time-duration">0:30</span>
          </div>
        </div>

        <!-- Right Controls -->
        <div class="player-right-controls" id="player-right-controls">
          <a href="#" target="_blank" class="spotify-link-icon group" id="player-spotify-link" title="Écouter le morceau sur Spotify">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.669.47-.745 3.85-.88 7.15-.506 9.818 1.13.296.18.387.563.209.86zm1.224-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.077-1.182-.413.125-.845-.108-.97-.52-.125-.413.108-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.345.366.226.486.705.26 1.07zm.106-2.833C14.382 8.87 8.544 8.677 5.16 9.704c-.52.158-1.066-.144-1.224-.662-.158-.52.143-1.067.662-1.224 3.886-1.18 10.33-.96 14.39 1.45.47.28.623.89.344 1.357-.28.47-.89.622-1.358.344z"/>
            </svg>
          </a>
          <div class="volume-container">
            <span class="vol-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            </span>
            <div class="volume-slider" id="volume-slider">
              <div class="volume-fill" id="volume-fill"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <script src="../assets/player.js"></script>
</body>
</html>`;

    playlistsFolder.file(`${slug}.html`, playlistPageHTML);
  });

  // Generate ZIP blob and download
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "site-lesondelacuriosite-vercel.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

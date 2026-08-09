/* ==========================================================================
   LE SON DE LA CURIOSITÉ - STANDALONE AUDIO PLAYER (VERCEL)
   ========================================================================== */

(function () {
  // Theme Toggle
  // Le thème est déjà posé par le script inline du <head> (préférence
  // enregistrée, sinon préférence système). On ne fait que le basculer ici.
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('melomanie_theme', next); } catch (e) {}
    });
  }

  // Apparition au défilement : hiérarchise la lecture d'un index long.
  // IntersectionObserver uniquement, jamais d'écouteur de scroll.
  const reveals = document.querySelectorAll('.reveal');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reveals.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  // View Mode Toggle (Cards / List)
  const gridBtn = document.getElementById('view-mode-grid');
  const listBtn = document.getElementById('view-mode-list');
  const gridContainer = document.getElementById('tracks-grid') || document.getElementById('catalog-grid');

  if (gridBtn && listBtn && gridContainer) {
    const isHomepage = !!document.getElementById('catalog-grid');
    const storageKey = isHomepage ? 'melomanie_catalog_view_mode' : 'melomanie_track_view_mode';

    const savedView = localStorage.getItem(storageKey) || 'grid';
    setViewMode(savedView);

    gridBtn.addEventListener('click', () => setViewMode('grid'));
    listBtn.addEventListener('click', () => setViewMode('list'));

    function setViewMode(mode) {
      localStorage.setItem(storageKey, mode);
      if (mode === 'list') {
        gridContainer.classList.add('list-view');
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
      } else {
        gridContainer.classList.remove('list-view');
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
      }
    }
  }

  // Audio Player Logic
  let currentAudio = null;
  let currentPlayingTrackId = null;
  let isPlaying = false;
  let currentVolume = 0.8;

  const globalPlayer = document.getElementById('global-player');
  const playerArt = document.getElementById('player-art');
  const playerEqualizer = document.getElementById('player-equalizer');
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playerPlayBtn = document.getElementById('player-play-btn');
  const playerPlayIcon = document.getElementById('player-play-icon');
  const playerPrevBtn = document.getElementById('player-prev-btn');
  const playerNextBtn = document.getElementById('player-next-btn');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressBarBg = document.getElementById('progress-bar-bg') || document.getElementById('progress-bar-track');
  const timeCurrent = document.getElementById('time-current');
  const timeDuration = document.getElementById('time-duration');
  const playerSpotifyLink = document.getElementById('player-spotify-link');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeFill = document.getElementById('volume-fill');

  const tracks = window.__PLAYLIST_TRACKS__ || [];

  function getCardById(id) {
    return Array.from(document.querySelectorAll('.song-card'))
      .find(c => c.getAttribute('data-id') === id) || null;
  }

  function formatTime(sec) {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function normalizeStrForMatch(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function verifyiTunesMatch(track, candidate) {
    if (!candidate || !candidate.previewUrl) return false;

    const spotifyTitle = normalizeStrForMatch(track.title);
    const primaryArtist = normalizeStrForMatch(
      Array.isArray(track.artists) && track.artists.length > 0
        ? track.artists[0].name
        : (track.artist || '')
    );

    const candTitle = normalizeStrForMatch(candidate.trackName);
    const candArtist = normalizeStrForMatch(candidate.artistName);

    if (!spotifyTitle || !primaryArtist) return false;

    const cleanSpotifyTitle = spotifyTitle.replace(/\(.*?\)|\[.*?\]|-.*$/g, '').trim();
    const cleanCandTitle = candTitle.replace(/\(.*?\)|\[.*?\]|-.*$/g, '').trim();

    const titleMatches = (
      candTitle.includes(cleanSpotifyTitle) ||
      spotifyTitle.includes(cleanCandTitle) ||
      (cleanSpotifyTitle.length >= 3 && cleanCandTitle.includes(cleanSpotifyTitle)) ||
      (cleanCandTitle.length >= 3 && cleanSpotifyTitle.includes(cleanCandTitle))
    );

    if (!titleMatches) return false;

    const artistFirstWord = primaryArtist.split(' ')[0];
    const artistMatches = (
      candArtist.includes(primaryArtist) ||
      primaryArtist.includes(candArtist) ||
      (artistFirstWord.length >= 3 && candArtist.includes(artistFirstWord))
    );

    return artistMatches;
  }

  async function getTrackAudioUrl(track) {
    if (track.previewUrl && track.previewUrl.trim() !== "") {
      return track.previewUrl;
    }
    try {
      const artistName = Array.isArray(track.artists) && track.artists.length > 0 ? track.artists[0].name : (track.artist || '');
      const cleanTitle = (track.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
      const query = encodeURIComponent(`${artistName} ${cleanTitle}`);
      const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=5`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const match = data.results.find(candidate => verifyiTunesMatch(track, candidate));
        if (match && match.previewUrl) {
          return match.previewUrl;
        }
      }
    } catch (e) {
      console.warn("Échec de la recherche d'extrait iTunes :", e);
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

    if (currentAudio) {
      currentAudio.pause();
    }

    currentPlayingTrackId = id;
    const card = getCardById(id);
    const audioUrl = await getTrackAudioUrl(track);

    if (card) card.classList.toggle('unavailable', !audioUrl);

    if (audioUrl) {
      currentAudio = new Audio(audioUrl);
      currentAudio.volume = currentVolume;

      currentAudio.addEventListener('timeupdate', () => {
        if (!currentAudio) return;
        const cur = currentAudio.currentTime;
        const dur = currentAudio.duration || 30;
        const pct = (cur / dur) * 100;
        if (progressBarFill) progressBarFill.style.width = `${pct}%`;
        if (timeCurrent) timeCurrent.textContent = formatTime(cur);
        if (timeDuration) timeDuration.textContent = formatTime(dur);
      });

      currentAudio.addEventListener('ended', () => {
        playNextTrack();
      });

      try {
        await currentAudio.play();
        isPlaying = true;
      } catch (e) {
        console.error("Erreur de lecture audio :", e);
      }
    } else {
      currentAudio = null;
      isPlaying = false;
      if (progressBarFill) progressBarFill.style.width = '0%';
      if (timeCurrent) timeCurrent.textContent = "--:--";
      if (timeDuration) timeDuration.textContent = "Indisponible";
    }

    updateUI(isPlaying, track);
  }

  function updateUI(playing, trackObj) {
    const track = trackObj || tracks.find(t => t.id === currentPlayingTrackId);

    // Update Cards
    document.querySelectorAll('.song-card').forEach(card => {
      const cardId = card.getAttribute('data-id');
      const isThis = cardId === currentPlayingTrackId;
      if (isThis && playing) {
        card.classList.add('playing');
      } else {
        card.classList.remove('playing');
      }
    });

    // Update Dock Player
    if (globalPlayer && track) {
      globalPlayer.classList.remove('hidden');
      if (playerArt) playerArt.src = track.image || '';
      if (playerTitle) playerTitle.textContent = track.title;
      if (playerArtist) playerArtist.textContent = track.artist;
      if (playerSpotifyLink) playerSpotifyLink.href = track.url || '#';

      if (playerEqualizer) {
        if (playing) {
          playerEqualizer.classList.add('active');
        } else {
          playerEqualizer.classList.remove('active');
        }
      }

      if (playerPlayIcon) {
        playerPlayIcon.innerHTML = playing
          ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
          : `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
      }
    }
  }

  function playNextTrack() {
    if (!currentPlayingTrackId || tracks.length === 0) return;
    const idx = tracks.findIndex(t => t.id === currentPlayingTrackId);
    const nextIdx = (idx + 1) % tracks.length;
    playTrackById(tracks[nextIdx].id);
  }

  function playPrevTrack() {
    if (!currentPlayingTrackId || tracks.length === 0) return;
    const idx = tracks.findIndex(t => t.id === currentPlayingTrackId);
    const prevIdx = (idx - 1 + tracks.length) % tracks.length;
    playTrackById(tracks[prevIdx].id);
  }

  // Volume Slider
  if (volumeSlider) {
    volumeSlider.addEventListener('click', (e) => {
      const rect = volumeSlider.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      currentVolume = pct;
      if (currentAudio) currentAudio.volume = currentVolume;
      if (volumeFill) volumeFill.style.width = `${pct * 100}%`;
    });
  }

  // Bind Clicks
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

  if (playerPlayBtn) {
    playerPlayBtn.addEventListener('click', () => {
      if (currentPlayingTrackId) playTrackById(currentPlayingTrackId);
    });
  }

  if (playerNextBtn) playerNextBtn.addEventListener('click', playNextTrack);
  if (playerPrevBtn) playerPrevBtn.addEventListener('click', playPrevTrack);

  if (progressBarBg) {
    progressBarBg.addEventListener('click', (e) => {
      if (!currentAudio || !currentAudio.duration) return;
      const rect = progressBarBg.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      currentAudio.currentTime = pct * currentAudio.duration;
    });
  }
})();

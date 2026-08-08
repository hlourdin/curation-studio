import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper pour formater les artistes en liens cliquables
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

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildStaticSite() {
  const siteDir = path.join(rootDir, 'site');
  const playlistsDir = path.join(siteDir, 'playlists');

  if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir, { recursive: true });
  if (!fs.existsSync(playlistsDir)) fs.mkdirSync(playlistsDir, { recursive: true });

  // Charger les données de playlists
  const dataPath = path.join(rootDir, 'src', 'data', 'playlists-data.json');
  let playlistsData = {};
  if (fs.existsSync(dataPath)) {
    try {
      playlistsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
      console.error("Erreur de lecture de playlists-data.json :", e);
    }
  }

  const slugs = Object.keys(playlistsData);
  console.log(`🔨 Génération du site statique Vercel pour ${slugs.length} playlist(s)...`);

  // --- 1. GÉNÉRATION DE LA PAGE D'ACCUEIL (site/index.html) ---
  const playlistCardsHTML = slugs.map(slug => {
    const pl = playlistsData[slug];
    const trackCount = pl.tracks ? pl.tracks.length : 0;
    const desc = pl.description || "Aucune description fournie.";
    return `
      <a href="playlists/${slug}.html" class="playlist-card group">
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
    <!-- Header Navbar -->
    <header class="site-header">
      <nav class="nav-island">
        <a href="index.html" class="brand-logo">
          <div class="brand-text">
            <span class="brand-name">Le Son de la Curiosité</span>
            <span class="brand-sub">Audio Curation</span>
          </div>
        </a>
        <div class="header-controls">
          <button id="theme-toggle-btn" class="icon-btn" title="Changer le thème (Sombre/Clair)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>
        </div>
      </nav>
    </header>

    <!-- Hero Section -->
    <section class="hero-section">
      <h1 class="hero-title">
        <span class="hero-title-text">Le Son de la Curiosité</span>
      </h1>
      <p class="hero-description">
        Explorez nos sélections musicales saisonnières et thématiques. Une curation sonore épurée, commentée et disponible en écoute directe.
      </p>
    </section>

    <!-- Playlist Catalog -->
    <main>
      <div class="playlists-catalog-grid">
        ${playlistCardsHTML}
      </div>
    </main>
  </div>

  <script src="assets/player.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(siteDir, 'index.html'), homepageHTML, 'utf8');

  // --- 2. GÉNÉRATION DES PAGES DE PLAYLIST INDIVIDUELLES (site/playlists/[slug].html) ---
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
    <!-- Header Navbar -->
    <header class="site-header">
      <nav class="nav-island">
        <a href="../index.html" class="brand-logo">
          <div class="brand-text">
            <span class="brand-name">Le Son de la Curiosité</span>
            <span class="brand-sub">Audio Curation</span>
          </div>
        </a>
        <div class="header-controls">
          <button id="theme-toggle-btn" class="icon-btn" title="Changer le thème (Sombre/Clair)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>
        </div>
      </nav>
    </header>

    <!-- Playlist Hero Section -->
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

      <!-- Tracklist Grid -->
      <div class="tracks-grid">
        ${tracksCardsHTML}
      </div>
    </main>
  </div>

  <!-- Audio Player Dock Fixe -->
  <div class="global-player-dock hidden" id="global-player">
    <div class="player-dock-inner">
      <div class="player-track-meta">
        <img class="player-art-img" id="player-art" src="" alt="Album Art">
        <div class="player-track-text">
          <span class="player-track-title" id="player-title">Morceau</span>
          <span class="player-track-artist" id="player-artist">Artiste</span>
        </div>
      </div>

      <div class="player-controls-group">
        <div class="player-buttons">
          <button class="player-btn" id="player-prev-btn" title="Morceau précédent">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"/></svg>
          </button>
          <button class="player-btn player-btn-main" id="player-play-btn" title="Lecture / Pause">
            <span id="player-play-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            </span>
          </button>
          <button class="player-btn" id="player-next-btn" title="Morceau suivant">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/></svg>
          </button>
        </div>

        <div class="progress-container">
          <span id="time-current">0:00</span>
          <div class="progress-bar-track" id="progress-bar-track">
            <div class="progress-bar-fill" id="progress-bar-fill"></div>
          </div>
          <span id="time-duration">0:30</span>
        </div>
      </div>
    </div>
  </div>

  <script src="../assets/player.js"></script>
</body>
</html>`;

    fs.writeFileSync(path.join(playlistsDir, `${slug}.html`), playlistPageHTML, 'utf8');
  });

  console.log(`✅ Génération terminée ! Le répertoire 'site/' est prêt pour Vercel.`);
}

// Si exécuté directement via Node
if (process.argv[1] && process.argv[1].endsWith('export-site.js')) {
  buildStaticSite();
}

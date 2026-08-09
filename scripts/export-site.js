import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/* ==========================================================================
   OUTILS DE TEXTE
   ========================================================================== */

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// La direction typographique du site proscrit les tirets cadratins.
// Normalisé à la génération pour que la règle tienne quoi que saisisse le curateur.
function typo(str) {
  if (!str) return '';
  return String(str).replace(/\s*[—–]\s*/g, ' - ');
}

function text(str) {
  return escapeHTML(typo(str));
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function countLabel(n, singular, plural) {
  return `${n} ${n > 1 ? plural : singular}`;
}

function getCover(pl) {
  return (
    pl.coverImage ||
    pl.image ||
    (Array.isArray(pl.tracks) && pl.tracks.length > 0 ? pl.tracks[0].image : '')
  );
}

/* ==========================================================================
   ICÔNES
   Tracés repris de la bibliothèque Feather (MIT) déjà utilisée par le projet,
   plus la marque Spotify. Aucun pictogramme dessiné à la main.
   ========================================================================== */

const ICON = {
  sun: '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
  moon: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>',
  volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
  spotify:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.669.47-.745 3.85-.88 7.15-.506 9.818 1.13.296.18.387.563.209.86zm1.224-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.077-1.182-.413.125-.845-.108-.97-.52-.125-.413.108-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.345.366.226.486.705.26 1.07zm.106-2.833C14.382 8.87 8.544 8.677 5.16 9.704c-.52.158-1.066-.144-1.224-.662-.158-.52.143-1.067.662-1.224 3.886-1.18 10.33-.96 14.39 1.45.47.28.623.89.344 1.357-.28.47-.89.622-1.358.344z"/></svg>'
};

/* ==========================================================================
   FRAGMENTS PARTAGÉS
   `base` vaut '' à la racine et '../' pour les pages de collection.
   ========================================================================== */

function head({ title, description, base }) {
  return `  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="preload" href="${base}assets/fonts/playfair-display-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${base}assets/fonts/archivo-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${base}assets/style.css">
  <script>
    (function () {
      var stored = null;
      try { stored = localStorage.getItem('melomanie_theme'); } catch (e) {}
      var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.add('js-reveal');
    })();
  </script>`;
}

function masthead({ base, showCatalogLink }) {
  return `  <header class="masthead">
    <div class="wrap masthead-inner">
      <a class="wordmark" href="${base}index.html">
        <span class="wordmark-name">Le Son de la Curiosité</span>
        <span class="wordmark-sub">Audio Curation</span>
      </a>
      <nav class="masthead-nav">
${showCatalogLink ? `        <a class="masthead-link" href="${base}index.html">Collections</a>\n` : ''}        <button type="button" id="theme-toggle-btn" class="theme-btn" title="Changer de thème" aria-label="Changer de thème">
          ${ICON.sun}
          ${ICON.moon}
        </button>
      </nav>
    </div>
  </header>`;
}

function viewToggle() {
  return `        <div class="view-toggle-group" role="group" aria-label="Mode d'affichage">
          <button type="button" class="view-toggle-btn active" id="view-mode-grid" data-view="grid" title="Affichage en planche">
            ${ICON.grid}
            <span>Planche</span>
          </button>
          <button type="button" class="view-toggle-btn" id="view-mode-list" data-view="list" title="Affichage en index">
            ${ICON.list}
            <span>Index</span>
          </button>
        </div>`;
}

function colophon() {
  return `  <footer class="colophon">
    <div class="wrap colophon-inner">
      <p class="colophon-text">
        <span class="colophon-name">Le Son de la Curiosité</span>
        Sélections personnelles, mises à jour au fil des saisons. Les extraits de 30 secondes proviennent de Spotify et d'Apple Music.
      </p>
      <a class="btn btn-ghost" href="https://open.spotify.com" target="_blank" rel="noopener">
        ${ICON.spotify}
        <span>Spotify</span>
      </a>
    </div>
  </footer>`;
}

/* ==========================================================================
   GRILLE LOOKBOOK
   Motif de 6 colonnes en 2-2-2 / 4-2 pour éviter la répétition de cartes
   identiques. La grande case arrive en deuxième rangée : la collection mise
   en avant en ouverture n'est ainsi pas montrée deux fois en grand format.
   La dernière rangée incomplète est étirée : jamais de case vide.
   ========================================================================== */

function computeSpans(count) {
  const pattern = [2, 2, 2, 4, 2];
  const spans = [];
  for (let i = 0; i < count; i++) spans.push(pattern[i % pattern.length]);

  let row = 0;
  for (let i = 0; i < count; i++) {
    row += spans[i];
    if (row >= 6) row = 0;
  }
  if (row > 0 && count > 0) spans[count - 1] += 6 - row;

  return spans;
}

/* ==========================================================================
   LIENS ARTISTES
   ========================================================================== */

function artistsHTML(track) {
  const link = (name, url) =>
    `<a href="${escapeHTML(url)}" target="_blank" rel="noopener" class="artist-link" title="Voir ${text(name)} sur Spotify">${text(name)}</a>`;

  if (Array.isArray(track.artists) && track.artists.length > 0) {
    return track.artists
      .map(a => link(a.name, a.url || `https://open.spotify.com/search/${encodeURIComponent(a.name)}`))
      .join(', ');
  }
  if (track.artist && track.artistUrl) {
    return link(track.artist, track.artistUrl);
  }
  if (track.artist) {
    return track.artist
      .split(',')
      .map(n => n.trim())
      .filter(Boolean)
      .map(n => link(n, `https://open.spotify.com/search/${encodeURIComponent(n)}`))
      .join(', ');
  }
  return '<span class="artist-link">Artiste inconnu</span>';
}

/* ==========================================================================
   GÉNÉRATION
   ========================================================================== */

export function buildStaticSite() {
  const siteDir = path.join(rootDir, 'site');
  const playlistsDir = path.join(siteDir, 'playlists');

  if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir, { recursive: true });
  if (!fs.existsSync(playlistsDir)) fs.mkdirSync(playlistsDir, { recursive: true });

  const dataPath = path.join(rootDir, 'src', 'data', 'playlists-data.json');
  let playlistsData = {};
  if (fs.existsSync(dataPath)) {
    try {
      playlistsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
      console.error('Erreur de lecture de playlists-data.json :', e);
    }
  }

  const slugs = Object.keys(playlistsData).sort((a, b) => {
    const orderA = typeof playlistsData[a].order === 'number' ? playlistsData[a].order : 999;
    const orderB = typeof playlistsData[b].order === 'number' ? playlistsData[b].order : 999;
    return orderA - orderB;
  });

  console.log(`Génération du site statique pour ${slugs.length} collection(s)...`);

  writeHomepage({ siteDir, slugs, playlistsData });
  slugs.forEach((slug, index) => {
    writePlaylistPage({ playlistsDir, slug, pl: playlistsData[slug], slugs, index });
  });

  // Nettoyage : retirer les pages orphelines dont la collection a été supprimée.
  const expected = new Set(slugs.map(s => `${s}.html`));
  fs.readdirSync(playlistsDir)
    .filter(f => f.endsWith('.html') && !expected.has(f))
    .forEach(f => {
      fs.unlinkSync(path.join(playlistsDir, f));
      console.log(`  page orpheline supprimée : playlists/${f}`);
    });

  console.log("Génération terminée. Le répertoire 'site/' est prêt pour Vercel.");
}

/* --------------------------------------------------------------------------
   PAGE D'ACCUEIL
   -------------------------------------------------------------------------- */

function writeHomepage({ siteDir, slugs, playlistsData }) {
  const spans = computeSpans(slugs.length);

  const cards = slugs
    .map((slug, i) => {
      const pl = playlistsData[slug];
      const trackCount = Array.isArray(pl.tracks) ? pl.tracks.length : 0;
      const cover = getCover(pl);
      const span = spans[i];
      const size = span >= 4 ? 'wide' : 'standard';

      const frame = cover
        ? `<img src="${escapeHTML(cover)}" alt="Pochette de ${text(pl.name)}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">`
        : `<span class="collection-placeholder">${ICON.note}</span>`;

      const desc = typo(pl.description || '').trim();

      return `        <a class="collection reveal" style="--span:${span}; --i:${i % 6}" data-size="${size}" href="playlists/${slug}.html">
          <span class="collection-index">${pad2(i + 1)}</span>
          <div class="collection-frame">${frame}</div>
          <div class="collection-line">
            <h3 class="collection-title">${text(pl.name)}</h3>
            <span class="collection-count meta">${countLabel(trackCount, 'titre', 'titres')}</span>
          </div>${desc ? `\n          <p class="collection-desc">${escapeHTML(desc)}</p>` : ''}
        </a>`;
    })
    .join('\n');

  const featuredSlug = slugs[0];
  const featured = featuredSlug ? playlistsData[featuredSlug] : null;
  const featuredCover = featured ? getCover(featured) : '';
  const featuredCount = featured && Array.isArray(featured.tracks) ? featured.tracks.length : 0;

  const opening = featured
    ? `  <section class="opening">
    <div class="wrap opening-grid">
      <div class="opening-text">
        <h1 class="opening-title">Des morceaux choisis, <em>saison après saison</em>.</h1>
        <p class="opening-lede">Chaque collection réunit les morceaux qui ont compté, commentés quand il y a quelque chose à dire.</p>
        <div class="opening-actions">
          <a class="btn btn-primary" href="playlists/${featuredSlug}.html">Dernière collection</a>
        </div>
      </div>
      <a class="opening-visual" href="playlists/${featuredSlug}.html">
        <div class="opening-frame">${
          featuredCover
            ? `<img src="${escapeHTML(featuredCover)}" alt="Pochette de ${text(featured.name)}" fetchpriority="high" decoding="async">`
            : `<span class="collection-placeholder">${ICON.note}</span>`
        }</div>
        <div class="opening-caption">
          <span class="opening-caption-name">${text(featured.name)}</span>
          <span class="meta">${countLabel(featuredCount, 'titre', 'titres')}</span>
        </div>
      </a>
    </div>
  </section>`
    : `  <section class="opening">
    <div class="wrap">
      <h1 class="opening-title">Des morceaux choisis, <em>saison après saison</em>.</h1>
      <p class="opening-lede">Les collections apparaîtront ici dès la première playlist importée depuis le Studio.</p>
    </div>
  </section>`;

  const catalog = slugs.length
    ? `      <div class="collection-set" id="catalog-grid">
${cards}
      </div>`
    : `      <div class="collection-set" id="catalog-grid"></div>
      <div class="empty-state">
        <h3 class="empty-title">Aucune collection pour l'instant</h3>
        <p class="empty-text">Importez une playlist depuis le Studio, puis relancez la génération du site.</p>
      </div>`;

  const html = `<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
${head({
    title: 'Le Son de la Curiosité · Audio Curation',
    description: 'Sélections musicales saisonnières, commentées et écoutables en extrait.',
    base: ''
  })}
</head>
<body>
${masthead({ base: '', showCatalogLink: false })}

  <main>
${opening}

    <section class="collections">
      <div class="wrap">
        <div class="toolbar">
          <h2 class="toolbar-title">Collections</h2>
          <div class="toolbar-side">
            <span class="meta">${countLabel(slugs.length, 'collection', 'collections')}</span>
${viewToggle()}
          </div>
        </div>
${catalog}
      </div>
    </section>
  </main>

${colophon()}

  <script src="assets/player.js"></script>
</body>
</html>
`;

  fs.writeFileSync(path.join(siteDir, 'index.html'), html, 'utf8');
}

/* --------------------------------------------------------------------------
   PAGE DE COLLECTION
   -------------------------------------------------------------------------- */

function writePlaylistPage({ playlistsDir, slug, pl, index }) {
  const tracks = Array.isArray(pl.tracks) ? pl.tracks : [];
  const cover = getCover(pl);
  const desc = typo(pl.description || '').trim();

  const trackCards = tracks
    .map((track, i) => {
      const note = typo(track.comment || '').trim();

      return `        <article class="song-card reveal" data-id="${escapeHTML(track.id)}" style="--i:${i % 6}">
          <div class="song-card-inner">
            <span class="track-index">${pad2(i + 1)}</span>
            <div class="track-frame">
              <img src="${escapeHTML(track.image)}" alt="Pochette de ${text(track.album)}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async">
              <span class="track-bars" aria-hidden="true"><i></i><i></i><i></i></span>
              <button type="button" class="play-card-btn" data-id="${escapeHTML(track.id)}" aria-label="Écouter ${text(track.title)}">
                ${ICON.play}
              </button>
            </div>
            <div class="track-text">
              <div class="track-title-row">
                <h3 class="track-title">${text(track.title)}</h3>
                <a class="track-out" href="${escapeHTML(track.url)}" target="_blank" rel="noopener" title="Ouvrir sur Spotify" aria-label="Ouvrir ${text(track.title)} sur Spotify">${ICON.external}</a>
              </div>
              <p class="track-artist">${artistsHTML(track)}</p>
              <p class="track-album">${text(track.album)}</p>
              <p class="track-unavailable">Extrait indisponible</p>
            </div>${note ? `\n            <blockquote class="track-note">${escapeHTML(note)}</blockquote>` : ''}
          </div>
        </article>`;
    })
    .join('\n');

  const tracklist = tracks.length
    ? `      <div class="track-set" id="tracks-grid">
${trackCards}
      </div>`
    : `      <div class="track-set" id="tracks-grid"></div>
      <div class="empty-state">
        <h3 class="empty-title">Cette collection est vide</h3>
        <p class="empty-text">Aucun morceau n'a encore été importé pour cette sélection.</p>
      </div>`;

  const html = `<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
${head({
    title: `${text(pl.name)} · Le Son de la Curiosité`,
    description: escapeHTML(desc || `Sélection musicale : ${typo(pl.name)}.`),
    base: '../'
  })}
  <script>
    window.__PLAYLIST_TRACKS__ = ${JSON.stringify(tracks).replace(/</g, '\\u003c')};
  </script>
</head>
<body>
${masthead({ base: '../', showCatalogLink: true })}

  <main>
    <div class="wrap">
      <a class="back-link" href="../index.html">${ICON.arrowLeft}<span>Toutes les collections</span></a>
    </div>

    <section class="collection-head">
      <div class="wrap">
        <h1 class="collection-head-title">${text(pl.name)}</h1>
        <div class="collection-head-frame">${
          cover
            ? `<img src="${escapeHTML(cover)}" alt="Pochette de ${text(pl.name)}" fetchpriority="high" decoding="async">`
            : `<span class="collection-placeholder">${ICON.note}</span>`
        }</div>
        <div class="collection-head-facts">
${desc ? `          <p class="collection-head-desc">${escapeHTML(desc)}</p>\n` : ''}          <div class="collection-head-actions">
            <span class="meta">${countLabel(tracks.length, 'titre', 'titres')}</span>
${
  pl.spotifyUrl
    ? `            <a class="btn btn-ghost" href="${escapeHTML(pl.spotifyUrl)}" target="_blank" rel="noopener">${ICON.spotify}<span>Ouvrir sur Spotify</span></a>\n`
    : ''
}          </div>
        </div>
      </div>
    </section>

    <section class="tracklist">
      <div class="wrap">
        <div class="toolbar">
          <h2 class="toolbar-title">Titres</h2>
          <div class="toolbar-side">
            <span class="meta">${countLabel(tracks.length, 'titre', 'titres')}</span>
${viewToggle()}
          </div>
        </div>
${tracklist}
      </div>
    </section>
  </main>

${colophon()}

  <div class="global-player hidden" id="global-player">
    <div class="player-inner">
      <div class="player-track-info" id="player-track-info">
        <div class="player-art-frame">
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" class="player-art" id="player-art">
          <div class="player-equalizer-bars" id="player-equalizer" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>
        <div class="player-metadata">
          <div class="player-title" id="player-title">Aucun titre</div>
          <div class="player-artist" id="player-artist">Sélectionnez un morceau</div>
        </div>
      </div>

      <div class="player-controls">
        <div class="control-buttons">
          <button type="button" class="player-btn" id="player-prev-btn" title="Titre précédent" aria-label="Titre précédent">${ICON.prev}</button>
          <button type="button" class="player-btn play-pause" id="player-play-btn" title="Lecture ou pause" aria-label="Lecture ou pause">
            <span class="play-icon-holder" id="player-play-icon">${ICON.play}</span>
          </button>
          <button type="button" class="player-btn" id="player-next-btn" title="Titre suivant" aria-label="Titre suivant">${ICON.next}</button>
        </div>
        <div class="progress-container">
          <span class="time-display" id="time-current">0:00</span>
          <div class="progress-bar-bg" id="progress-bar-bg" role="slider" aria-label="Progression" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
            <div class="progress-bar-fill" id="progress-bar-fill"><span class="progress-glow-head"></span></div>
          </div>
          <span class="time-display" id="time-duration">0:30</span>
        </div>
      </div>

      <div class="player-right-controls">
        <a class="player-spotify" href="#" target="_blank" rel="noopener" id="player-spotify-link" title="Écouter sur Spotify" aria-label="Écouter sur Spotify">${ICON.spotify}</a>
        <div class="volume-container">
          <span class="vol-icon" aria-hidden="true">${ICON.volume}</span>
          <div class="volume-slider" id="volume-slider" role="slider" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="80" tabindex="0">
            <div class="volume-fill" id="volume-fill"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="../assets/player.js"></script>
</body>
</html>
`;

  fs.writeFileSync(path.join(playlistsDir, `${slug}.html`), html, 'utf8');
}

// Exécution directe via Node
if (process.argv[1] && process.argv[1].endsWith('export-site.js')) {
  buildStaticSite();
}

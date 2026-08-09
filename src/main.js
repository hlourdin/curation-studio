import {
  redirectToSpotifyAuth,
  getAccessToken,
  logout,
  getValidAccessToken,
  extractPlaylistId,
  fetchSpotifyPlaylist
} from './utils/spotify.js';

import defaultConfig from './data/config.json';
import defaultPlaylistsData from './data/playlists-data.json';
import { exportStudioSiteZIP } from './utils/exporter.js';

// Variables d'état global
let playlists = {};
let activePlaylistSlug = '';
let currentPlayingTrack = null;
let isPlaying = false;
let audio = null;
let playlistTracks = [];
let currentViewMode = localStorage.getItem('melomanie_track_view_mode') || 'grid';

// DOM Cache - Écrans
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const spotifyLoginBtn = document.getElementById('spotify-login-btn');

// DOM Cache - Contôles Playlist & Navbar
const playlistSelect = document.getElementById('playlist-select');
const playlistName = document.getElementById('playlist-name');
const playlistDescription = document.getElementById('playlist-description');
const playlistDescriptionContainer = document.getElementById('playlist-description-container');
const playlistSpotifyLink = document.getElementById('playlist-spotify-link');
const playlistEditionTag = document.getElementById('playlist-edition-tag');
const tracksGrid = document.getElementById('tracks-grid');
const loadingOrEmpty = document.getElementById('loading-or-empty');

const playlistInput = document.getElementById('playlist-input');
const importBtn = document.getElementById('import-btn');
const logoutBtn = document.getElementById('logout-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const clearDataBtn = document.getElementById('clear-data-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// DOM Cache - Lecteur Audio Global
const globalPlayer = document.getElementById('global-player');
const playerArt = document.getElementById('player-art');
const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const playerPlayBtn = document.getElementById('player-play-btn');
const playerPlayIcon = document.getElementById('player-play-icon');
const playerPrevBtn = document.getElementById('player-prev-btn');
const playerNextBtn = document.getElementById('player-next-btn');
const playerSpotifyLinkIcon = document.getElementById('player-spotify-link');
const progressBarBg = document.getElementById('progress-bar-bg');
const progressBarFill = document.getElementById('progress-bar-fill');
const timeCurrent = document.getElementById('time-current');
const timeDuration = document.getElementById('time-duration');
const volumeSlider = document.getElementById('volume-slider');
const volumeFill = document.getElementById('volume-fill');

let currentVolume = 0.8;

// Initialisation du Thème (Clair / Sombre)
function setupTheme() {
  const savedTheme = localStorage.getItem('melomanie_theme') || 'dark';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.onclick = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('melomanie_theme', newTheme);
    };
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  if (themeToggleBtn) {
    const sunIcon = themeToggleBtn.querySelector('.theme-icon-sun');
    const moonIcon = themeToggleBtn.querySelector('.theme-icon-moon');
    if (sunIcon && moonIcon) {
      if (theme === 'light') {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
      } else {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
      }
    }
  }
}

// Initialisation de l'application
async function init() {
  // Gérer le thème dès le départ
  setupTheme();

  // 1. Gérer l'authentification Spotify (redirection de retour)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  let token = null;

  if (code) {
    // Si on a un code de retour de Spotify, on l'échange contre un token
    try {
      showGlobalLoading(true, "Authentification avec Spotify...");
      token = await getAccessToken(code);
      // Nettoyer l'URL sans recharger la page
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la connexion à Spotify. Veuillez réessayer.");
    } finally {
      showGlobalLoading(false);
    }
  } else {
    // Sinon on vérifie si on a déjà un token d'accès valide
    token = await getValidAccessToken();
  }

  // 2. Adapter l'affichage selon le statut d'authentification
  if (token) {
    showLoginScreen(false);
    setupApp(token);
  } else {
    showLoginScreen(true);
  }
}

// Affiche ou masque l'écran de connexion
function showLoginScreen(show) {
  if (show) {
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    // Événement bouton de connexion
    spotifyLoginBtn.onclick = () => redirectToSpotifyAuth();
  } else {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
  }
}

// Configure l'application une fois connecté
function setupApp(token) {
  // Charger les données (fusion entre LocalStorage et fichiers de démo par défaut)
  loadPlaylistsData();

  // Clic sur le logo de l'en-tête pour ouvrir le catalogue global
  const logoLink = document.getElementById('logo-link');
  if (logoLink) {
    logoLink.onclick = (e) => {
      e.preventDefault();
      showCatalogView();
    };
  }

  // Événements d'importation & ré-importation
  importBtn.onclick = () => handleImport(token);
  playlistInput.onkeydown = (e) => {
    if (e.key === 'Enter') handleImport(token);
  };
  const reimportBtn = document.getElementById('reimport-playlist-btn');
  if (reimportBtn) {
    reimportBtn.onclick = () => handleReimport(token);
  }

  // Événement déconnexion
  logoutBtn.onclick = () => {
    if (isPlaying) pauseTrack();
    logout();
    showLoginScreen(true);
  };

  // Événements d'export & d'effacement
  const exportSiteBtn = document.getElementById('export-site-btn');
  if (exportSiteBtn) {
    exportSiteBtn.onclick = async () => {
      try {
        exportSiteBtn.disabled = true;
        const res = await fetch('/api/export-site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(playlists)
        });
        const data = await res.json();
        if (data.success) {
          alert(`✨ Le site statique a été généré directement dans le répertoire "site/" (${data.count} playlist(s) traitée(s)) !\n\nVous pouvez cliquer sur "Voir le site" pour prévisualiser ou faire "git push" pour publier sur Vercel.`);
        } else {
          exportStudioSiteZIP(playlists);
        }
      } catch (e) {
        exportStudioSiteZIP(playlists);
      } finally {
        exportSiteBtn.disabled = false;
      }
    };
  }
  if (exportJsonBtn) exportJsonBtn.onclick = () => exportPlaylistsToJSON();
  if (clearDataBtn) clearDataBtn.onclick = () => clearAllPlaylists();

  // Événement de changement de playlist
  playlistSelect.onchange = (e) => {
    const val = e.target.value;
    if (val === 'all') {
      showCatalogView();
    } else {
      switchPlaylist(val);
    }
  };

  // Lecteur audio
  setupPlayerEvents();

  // Remplir le sélecteur
  populatePlaylistSelector();

  // Éditeur de description & réorganisation
  setupDescriptionEditor();
  setupReorderModal();
  setupViewModeToggle();

  // Charger la playlist active
  if (activePlaylistSlug) {
    loadPlaylist(activePlaylistSlug);
  } else {
    showEmptyState(true);
  }
}

// Charge les playlists depuis LocalStorage ou le fichier JSON par défaut
function loadPlaylistsData() {
  const localData = window.localStorage.getItem('melomanie_playlists');
  
  if (localData) {
    try {
      playlists = JSON.parse(localData);
    } catch (e) {
      console.error("Échec de la lecture de melomanie_playlists dans localStorage, réinitialisation.");
      playlists = {};
    }
  }

  // Si playlists est vide ou si aucune playlist valide n'est présente, charger les données par défaut
  if (!playlists || Object.keys(playlists).length === 0) {
    playlists = defaultPlaylistsData;
  } else {
    // S'assurer que la saison par défaut dispose toujours de ses morceaux
    Object.keys(defaultPlaylistsData).forEach(slug => {
      if (!playlists[slug] || !playlists[slug].tracks || playlists[slug].tracks.length === 0) {
        playlists[slug] = defaultPlaylistsData[slug];
      }
    });
  }

  initActivePlaylistSlug();
}
// Helper pour récupérer les slugs triés par ordre personnalisé
function getSortedPlaylistSlugs(playlistsData = playlists) {
  const slugs = Object.keys(playlistsData);
  return slugs.sort((a, b) => {
    const orderA = typeof playlistsData[a].order === 'number' ? playlistsData[a].order : 999;
    const orderB = typeof playlistsData[b].order === 'number' ? playlistsData[b].order : 999;
    return orderA - orderB;
  });
}

// Définir la playlist active par défaut
function initActivePlaylistSlug() {
  const slugs = getSortedPlaylistSlugs(playlists);
  if (slugs.length > 0) {
    activePlaylistSlug = window.localStorage.getItem('melomanie_active_slug') || slugs[0];
    if (!playlists[activePlaylistSlug] || !playlists[activePlaylistSlug].tracks || playlists[activePlaylistSlug].tracks.length === 0) {
      activePlaylistSlug = slugs[0];
    }
  } else {
    activePlaylistSlug = '';
  }
}

// Sauvegarde l'état actuel dans le LocalStorage
function savePlaylistsData() {
  window.localStorage.setItem('melomanie_playlists', JSON.stringify(playlists));
  if (activePlaylistSlug) {
    window.localStorage.setItem('melomanie_active_slug', activePlaylistSlug);
  } else {
    window.localStorage.removeItem('melomanie_active_slug');
  }
}

// Remplit le sélecteur de playlists dans l'en-tête selon l'ordre trié
function populatePlaylistSelector() {
  playlistSelect.innerHTML = '';
  const sortedSlugs = getSortedPlaylistSlugs(playlists);

  if (sortedSlugs.length === 0) {
    playlistSelect.closest('.playlist-selector-wrapper').classList.add('hidden');
    return;
  }

  playlistSelect.closest('.playlist-selector-wrapper').classList.remove('hidden');
  
  // Option "Toutes les playlists"
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = '📚 Toutes les playlists';
  playlistSelect.appendChild(allOption);

  sortedSlugs.forEach(slug => {
    const option = document.createElement('option');
    option.value = slug;
    option.textContent = playlists[slug].name;
    playlistSelect.appendChild(option);
  });

  const catalogView = document.getElementById('catalog-view');
  const isCatalogVisible = catalogView && !catalogView.classList.contains('hidden');
  if (isCatalogVisible) {
    playlistSelect.value = 'all';
  } else {
    playlistSelect.value = activePlaylistSlug || (sortedSlugs.length > 0 ? sortedSlugs[0] : 'all');
  }
}

// Permet d'importer une nouvelle playlist Spotify
async function handleImport(token) {
  const inputValue = playlistInput.value.trim();
  if (!inputValue) {
    alert("Veuillez entrer une URL ou un ID de playlist Spotify.");
    return;
  }

  const playlistId = extractPlaylistId(inputValue);
  if (!playlistId) {
    alert("URL ou ID de playlist Spotify invalide.");
    return;
  }

  const loader = importBtn.querySelector('.btn-loader');
  const btnText = importBtn.querySelector('span');

  try {
    // Activer l'état de chargement sur le bouton
    importBtn.disabled = true;
    loader.classList.remove('hidden');
    btnText.textContent = 'Import...';

    const playlistData = await fetchSpotifyPlaylist(playlistId, token);
    
    // Générer un slug unique
    const slug = slugify(playlistData.name);

    // Si on a déjà des données locales avec des commentaires pour cette playlist, on tente de les fusionner
    if (playlists[slug]) {
      const commentMap = new Map();
      playlists[slug].tracks.forEach(track => {
        if (track.comment) {
          commentMap.set(track.id, track.comment);
        }
      });

      playlistData.tracks.forEach(track => {
        if (commentMap.has(track.id)) {
          track.comment = commentMap.get(track.id);
        }
      });
    }

    // Ajouter ou remplacer la playlist
    playlists[slug] = playlistData;
    activePlaylistSlug = slug;

    // Enregistrer
    savePlaylistsData();
    
    // Mettre à jour l'interface
    populatePlaylistSelector();
    loadPlaylist(slug);
    
    playlistInput.value = '';
    alert(`Playlist "${playlistData.name}" importée avec succès !`);
  } catch (e) {
    console.error(e);
    alert(e.message || "Une erreur est survenue lors de l'importation.");
  } finally {
    importBtn.disabled = false;
    loader.classList.add('hidden');
    btnText.textContent = 'Importer';
  }
}

// Permet de ré-importer la playlist active tout en conservant scrupuleusement les commentaires
async function handleReimport(token) {
  if (!activePlaylistSlug || !playlists[activePlaylistSlug]) {
    alert("Aucune playlist sélectionnée à ré-importer.");
    return;
  }

  const currentPlaylist = playlists[activePlaylistSlug];
  const playlistId = currentPlaylist.id || extractPlaylistId(currentPlaylist.spotifyUrl);

  if (!playlistId) {
    alert("Impossible de trouver l'ID Spotify de cette playlist.");
    return;
  }

  const reimportBtn = document.getElementById('reimport-playlist-btn');
  const loader = reimportBtn ? reimportBtn.querySelector('.btn-loader') : null;
  const icon = reimportBtn ? reimportBtn.querySelector('.reimport-icon') : null;
  const label = reimportBtn ? reimportBtn.querySelector('.reimport-btn-label') : null;

  try {
    if (reimportBtn) {
      reimportBtn.disabled = true;
      if (loader) loader.classList.remove('hidden');
      if (icon) icon.classList.add('hidden');
      if (label) label.textContent = 'Ré-import...';
    }

    let activeToken = token;
    if (!activeToken) {
      activeToken = await getValidAccessToken();
    }

    if (!activeToken) {
      alert("Veuillez vous connecter à Spotify pour ré-importer cette playlist.");
      return;
    }

    const playlistData = await fetchSpotifyPlaylist(playlistId, activeToken);
    const slug = activePlaylistSlug;

    // Fusionner les commentaires existants (association par ID et fallback par Titre-Artiste)
    const commentMap = new Map();
    if (Array.isArray(currentPlaylist.tracks)) {
      currentPlaylist.tracks.forEach(track => {
        if (track.comment) {
          if (track.id) commentMap.set(track.id, track.comment);
          const altKey = `${(track.title || '').toLowerCase().trim()}-${(track.artist || '').toLowerCase().trim()}`;
          commentMap.set(altKey, track.comment);
        }
      });
    }

    playlistData.tracks.forEach(track => {
      if (commentMap.has(track.id)) {
        track.comment = commentMap.get(track.id);
      } else {
        const altKey = `${(track.title || '').toLowerCase().trim()}-${(track.artist || '').toLowerCase().trim()}`;
        if (commentMap.has(altKey)) {
          track.comment = commentMap.get(altKey);
        }
      }
    });

    // Conserver l'ordre et la description si elle avait été personnalisée
    playlistData.order = typeof currentPlaylist.order === 'number' ? currentPlaylist.order : 999;
    if (!playlistData.description && currentPlaylist.description) {
      playlistData.description = currentPlaylist.description;
    }

    playlists[slug] = playlistData;
    savePlaylistsData();

    // Régénérer le site statique
    try {
      await fetch('/api/export-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlists)
      });
    } catch (exportErr) {
      console.warn("Régénération du site statique :", exportErr);
    }

    populatePlaylistSelector();
    loadPlaylist(slug);

    alert(`✨ Playlist "${playlistData.name}" ré-importée avec succès ! Vos commentaires ont été conservés.`);
  } catch (e) {
    console.error("Erreur lors de la ré-importation :", e);
    alert(e.message || "Une erreur est survenue lors de la ré-importation.");
  } finally {
    if (reimportBtn) {
      reimportBtn.disabled = false;
      if (loader) loader.classList.add('hidden');
      if (icon) icon.classList.remove('hidden');
      if (label) label.textContent = 'Ré-importer';
    }
  }
}

// Change la playlist active
function switchPlaylist(slug) {
  if (isPlaying) {
    pauseTrack();
  }
  const singleView = document.getElementById('single-playlist-view');
  const catalogView = document.getElementById('catalog-view');
  if (singleView && catalogView) {
    catalogView.classList.add('hidden');
    singleView.classList.remove('hidden');
  }
  activePlaylistSlug = slug;
  savePlaylistsData();
  loadPlaylist(slug);
}

// Charge et affiche les morceaux d'une playlist
function loadPlaylist(slug) {
  const data = playlists[slug];
  if (!data) {
    showEmptyState(true);
    return;
  }

  showEmptyState(false);
  playlistTracks = data.tracks || [];

  // Mettre à jour l'en-tête
  playlistName.textContent = data.name;
  renderPlaylistDescription();
  playlistSpotifyLink.href = data.spotifyUrl;
  if (playlistEditionTag) playlistEditionTag.textContent = data.name;

  const trackCountLabel = document.getElementById('track-count-label');
  if (trackCountLabel) {
    const count = playlistTracks.length;
    trackCountLabel.textContent = `${count} morceau${count > 1 ? 'x' : ''}`;
  }

  // Si on lit un morceau qui ne fait pas partie de cette playlist, on cache le lecteur
  if (currentPlayingTrack && !playlistTracks.some(t => t.id === currentPlayingTrack.id)) {
    hideGlobalPlayer();
  }

  // Rendre les cartes de morceaux
  renderTracks(playlistTracks);
}

// Initialise l'éditeur de description de playlist
function setupDescriptionEditor() {
  if (!playlistDescriptionContainer) return;
  playlistDescriptionContainer.onclick = () => {
    if (!activePlaylistSlug || !playlists[activePlaylistSlug]) return;
    if (playlistDescriptionContainer.querySelector('.hero-description-editor')) return;
    enterEditPlaylistDescriptionMode();
  };
}

// Ouvre l'éditeur de description en ligne
function enterEditPlaylistDescriptionMode() {
  const currentPlaylist = playlists[activePlaylistSlug];
  if (!currentPlaylist) return;

  const currentDesc = currentPlaylist.description || '';

  playlistDescriptionContainer.innerHTML = `
    <div class="hero-description-editor">
      <textarea class="hero-description-textarea" placeholder="Rédigez la description de cette playlist...">${currentDesc}</textarea>
      <div class="editor-actions">
        <button class="editor-btn cancel-btn">Annuler</button>
        <button class="editor-btn save-btn">Enregistrer</button>
      </div>
    </div>
  `;

  const textarea = playlistDescriptionContainer.querySelector('.hero-description-textarea');
  textarea.focus();
  const len = textarea.value.length;
  textarea.setSelectionRange(len, len);

  const cancelBtn = playlistDescriptionContainer.querySelector('.cancel-btn');
  cancelBtn.onclick = (e) => {
    e.stopPropagation();
    renderPlaylistDescription();
  };

  const saveBtn = playlistDescriptionContainer.querySelector('.save-btn');
  saveBtn.onclick = (e) => {
    e.stopPropagation();
    const newDesc = textarea.value.trim();
    currentPlaylist.description = newDesc;
    savePlaylistsData();
    renderPlaylistDescription();
  };
}

// Affiche la description actuelle de la playlist avec tooltip d'édition
function renderPlaylistDescription() {
  if (!playlistDescriptionContainer) return;
  const currentPlaylist = playlists[activePlaylistSlug];
  const descText = currentPlaylist ? (currentPlaylist.description || "Aucune description fournie par Spotify. Cliquer pour en ajouter une.") : "Aucune description.";
  
  playlistDescriptionContainer.innerHTML = `
    <p class="hero-description" id="playlist-description" title="Cliquer pour modifier la description de cette playlist">
      ${descText}
    </p>
  `;
}

// Affiche ou masque l'état vide
function showEmptyState(show) {
  if (show) {
    tracksGrid.classList.add('hidden');
    loadingOrEmpty.classList.remove('hidden');
    document.getElementById('hero-area').classList.remove('hidden');
    playlistName.textContent = "Le Son de la Curiosité";
    playlistDescription.textContent = "Importez une playlist Spotify ci-dessus pour afficher votre sélection musicale d'exception.";
    playlistSpotifyLink.classList.add('hidden');
  } else {
    tracksGrid.classList.remove('hidden');
    loadingOrEmpty.classList.add('hidden');
    document.getElementById('hero-area').classList.remove('hidden');
    playlistSpotifyLink.classList.remove('hidden');
  }
}

// Affiche un loader global au démarrage
function showGlobalLoading(show, message = "") {
  // Optionnel : on peut changer le bouton d'import en loader
}

// Gère le rendu de la grille de morceaux
function renderTracks(tracks) {
  tracksGrid.innerHTML = '';

  if (tracks.length === 0) {
    tracksGrid.innerHTML = `<p class="empty-state-desc">Cette playlist est vide.</p>`;
    return;
  }

  tracks.forEach((track, index) => {
    const card = document.createElement('div');
    card.className = 'song-card double-bezel-shell';
    card.id = `card-${track.id}`;
    card.style.animationDelay = `${index * 60}ms`;
    
    const isCurrent = currentPlayingTrack && currentPlayingTrack.id === track.id;
    if (isCurrent && isPlaying) {
      card.classList.add('playing');
    }

    // Bouton d'écoute avec Button-in-Button architecture et picto chevauché Spotify + Play
    let playIconSVG = (isCurrent && isPlaying)
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
      : getSpotifyPlayComboSVG();

    card.innerHTML = `
      <div class="double-bezel-core song-card-inner">
        <div class="album-art-wrapper">
          <img class="album-art" src="${track.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="${track.album}" loading="lazy">
          <div class="play-overlay">
            <button class="play-card-btn group" data-id="${track.id}" title="Écouter le morceau directement sur la page">
              <span class="btn-icon-bubble">
                ${playIconSVG}
              </span>
            </button>
          </div>
        </div>
        <div class="song-info">
          <div class="song-title-row">
            <h3 class="song-title" title="${track.title}">${track.title}</h3>
            <a href="${track.url}" target="_blank" class="spotify-link-icon" title="Ouvrir sur Spotify">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.669.47-.745 3.85-.88 7.15-.506 9.818 1.13.296.18.387.563.209.86zm1.224-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.077-1.182-.413.125-.845-.108-.97-.52-.125-.413.108-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.345.366.226.486.705.26 1.07zm.106-2.833C14.382 8.87 8.544 8.677 5.16 9.704c-.52.158-1.066-.144-1.224-.662-.158-.52.143-1.067.662-1.224 3.886-1.18 10.33-.96 14.39 1.45.47.28.623.89.344 1.357-.28.47-.89.622-1.358.344z"/></svg>
            </a>
          </div>
          <p class="song-artist">${getArtistHTML(track)}</p>
          <p class="song-album" title="${track.album}">${track.album}</p>
        </div>
        <div class="comment-container" id="comment-container-${track.id}">
          <!-- Injecté dynamiquement -->
        </div>
      </div>
    `;

    // Événement d'écoute (clic sur pochette, bouton play ou icône Spotify)
    const artWrapper = card.querySelector('.album-art-wrapper');
    if (artWrapper) {
      artWrapper.style.cursor = 'pointer';
      artWrapper.onclick = (e) => {
        e.stopPropagation();
        handlePlayClick(track);
      };
    }

    const playBtn = card.querySelector('.play-card-btn');
    if (playBtn) {
      playBtn.onclick = (e) => {
        e.stopPropagation();
        handlePlayClick(track);
      };
    }

    const spotifyIcon = card.querySelector('.spotify-link-icon');
    if (spotifyIcon) {
      spotifyIcon.onclick = (e) => {
        e.stopPropagation();
      };
    }

    // Rendre l'espace commentaire
    const commentWrapper = card.querySelector(`.comment-container`);
    renderCommentField(track, commentWrapper);

    tracksGrid.appendChild(card);
  });
}

// Affiche le commentaire ou l'éditeur selon l'état du morceau
function renderCommentField(track, wrapper) {
  wrapper.innerHTML = '';

  if (track.comment) {
    // Mode affichage
    const box = document.createElement('div');
    box.className = 'song-comment-box';
    box.title = 'Cliquer pour modifier votre commentaire';
    box.innerHTML = `<span class="comment-quote-mark">“</span><span class="comment-content">${track.comment}</span>`;
    box.onclick = () => enterEditCommentMode(track, wrapper);
    wrapper.appendChild(box);
  } else {
    // Mode "+ Ajouter un commentaire"
    const addBtn = document.createElement('button');
    addBtn.className = 'add-comment-trigger-btn group';
    addBtn.innerHTML = `
      <span class="add-icon-circle">+</span>
      <span>Ajouter une note ou critique</span>
    `;
    addBtn.onclick = () => enterEditCommentMode(track, wrapper);
    wrapper.appendChild(addBtn);
  }
}

// Passe en mode d'édition de commentaire
function enterEditCommentMode(track, wrapper) {
  wrapper.innerHTML = `
    <div class="comment-editor-wrapper">
      <textarea class="song-comment-textarea" placeholder="Que pensez-vous de ce morceau ? (Vos impressions, souvenirs, critique...)">${track.comment || ''}</textarea>
      <div class="editor-actions">
        <button class="editor-btn cancel-btn">Annuler</button>
        <button class="editor-btn save-btn">Enregistrer</button>
      </div>
    </div>
  `;

  // Focus sur la zone de texte
  const textarea = wrapper.querySelector('.song-comment-textarea');
  textarea.focus();
  
  // Placer le curseur à la fin du texte
  const len = textarea.value.length;
  textarea.setSelectionRange(len, len);

  // Annuler
  wrapper.querySelector('.cancel-btn').onclick = () => {
    renderCommentField(track, wrapper);
  };

  // Sauvegarder
  wrapper.querySelector('.save-btn').onclick = () => {
    const val = textarea.value.trim();
    track.comment = val;
    
    // Mettre à jour l'objet playlists global
    const currentPlaylist = playlists[activePlaylistSlug];
    const trackIndex = currentPlaylist.tracks.findIndex(t => t.id === track.id);
    if (trackIndex > -1) {
      currentPlaylist.tracks[trackIndex].comment = val;
    }
    
    // Sauvegarder dans LocalStorage
    savePlaylistsData();

    // Re-rendre le commentaire
    renderCommentField(track, wrapper);
  };
}

// --- LECTEUR AUDIO ---

// Gère le clic d'écoute
function handlePlayClick(track) {
  if (currentPlayingTrack && currentPlayingTrack.id === track.id) {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  } else {
    selectAndPlayTrack(track);
  }
}

// Nettoie et normalise une chaîne pour la comparaison
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

// Vérifie qu'un résultat iTunes correspond véritablement au morceau Spotify demandé
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

  // Nettoyage des titres (retrait des éléments entre parenthèses ou crochets comme feat., remix, live)
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

// Récupère une URL audio lisible en direct (preview direct Spotify ou secours iTunes instantané vérifié)
async function getTrackAudioUrl(track) {
  if (track.previewUrl && track.previewUrl.trim() !== '') return track.previewUrl;

  try {
    const artistName = Array.isArray(track.artists) && track.artists.length > 0 ? track.artists[0].name : (track.artist || '');
    const cleanTitle = (track.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const query = `${artistName} ${cleanTitle}`;
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const match = data.results.find(candidate => verifyiTunesMatch(track, candidate));
        if (match && match.previewUrl) {
          track.previewUrl = match.previewUrl;
          return track.previewUrl;
        }
      }
    }
  } catch (err) {
    console.warn("Erreur fallback audio iTunes :", err);
  }

  return null;
}

// Lance la lecture d'un morceau directement sur la page
async function selectAndPlayTrack(track) {
  if (currentPlayingTrack) {
    const oldCard = document.getElementById(`card-${currentPlayingTrack.id}`);
    if (oldCard) {
      oldCard.classList.remove('playing');
      updateCardPlayButton(oldCard, false);
    }
  }

  currentPlayingTrack = track;

  const playerCustomUI = document.getElementById('player-custom-ui');
  const spotifyEmbedContainer = document.getElementById('spotify-embed-container');
  const spotifyEmbedIframe = document.getElementById('spotify-embed-iframe');

  // Mettre à jour et afficher le lecteur immédiatement avec les métadonnées
  playerArt.src = track.image || '';
  playerTitle.textContent = track.title;
  playerArtist.innerHTML = getArtistHTML(track);
  playerSpotifyLinkIcon.href = track.url;
  globalPlayer.classList.add('visible');

  // Récupérer le flux audio direct (avec fallback instantané si preview Spotify absente)
  const audioUrl = await getTrackAudioUrl(track);

  if (playerCustomUI) playerCustomUI.classList.remove('hidden');
  if (spotifyEmbedContainer) spotifyEmbedContainer.classList.add('hidden');

  if (audioUrl) {
    isPlaying = true;

    if (audio) {
      audio.pause();
    }

    audio = new Audio(audioUrl);
    audio.volume = currentVolume;

    audio.addEventListener('timeupdate', updateProgressBar);
    audio.addEventListener('loadedmetadata', () => {
      timeDuration.textContent = formatTime(audio.duration);
    });
    audio.addEventListener('ended', () => {
      playNext();
    });

    const newCard = document.getElementById(`card-${track.id}`);
    if (newCard) {
      newCard.classList.add('playing');
      updateCardPlayButton(newCard, true);
    }

    try {
      await audio.play();
    } catch (e) {
      console.error("Échec du démarrage de la lecture :", e);
    }

    updateGlobalPlayerUI();
  } else {
    // Si aucune source audio 30s n'est disponible, on reste sur la page avec le statut indisponible
    if (audio) {
      audio.pause();
    }
    audio = null;
    isPlaying = false;

    if (progressBarFill) progressBarFill.style.width = '0%';
    if (timeCurrent) timeCurrent.textContent = "--:--";
    if (timeDuration) timeDuration.textContent = "Indisponible";

    updateGlobalPlayerUI();
  }
}

function playTrack() {
  if (!audio) return;
  isPlaying = true;
  audio.play();
  
  const card = document.getElementById(`card-${currentPlayingTrack.id}`);
  if (card) {
    card.classList.add('playing');
    updateCardPlayButton(card, true);
  }
  updateGlobalPlayerUI();
}

function pauseTrack() {
  if (!audio) return;
  isPlaying = false;
  audio.pause();
  
  const card = document.getElementById(`card-${currentPlayingTrack.id}`);
  if (card) {
    card.classList.remove('playing');
    updateCardPlayButton(card, false);
  }
  updateGlobalPlayerUI();
}

function playNext() {
  if (!currentPlayingTrack || playlistTracks.length === 0) return;
  const currentIndex = playlistTracks.findIndex(t => t.id === currentPlayingTrack.id);
  const nextIndex = (currentIndex + 1) % playlistTracks.length;
  selectAndPlayTrack(playlistTracks[nextIndex]);
}

function playPrev() {
  if (!currentPlayingTrack || playlistTracks.length === 0) return;
  const currentIndex = playlistTracks.findIndex(t => t.id === currentPlayingTrack.id);
  const prevIndex = (currentIndex - 1 + playlistTracks.length) % playlistTracks.length;
  selectAndPlayTrack(playlistTracks[prevIndex]);
}

function updateCardPlayButton(cardElement, playing) {
  const btn = cardElement.querySelector('.play-card-btn');
  if (btn) {
    const bubble = btn.querySelector('.btn-icon-bubble') || btn;
    if (playing) {
      bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`;
    } else {
      bubble.innerHTML = getSpotifyPlayComboSVG();
    }
  }
}

function updateGlobalPlayerUI() {
  const equalizer = document.getElementById('player-equalizer');
  if (isPlaying) {
    playerPlayIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`;
    if (equalizer) equalizer.classList.add('active');
  } else {
    playerPlayIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    if (equalizer) equalizer.classList.remove('active');
  }
}

function hideGlobalPlayer() {
  globalPlayer.classList.remove('visible');
  if (audio) {
    audio.pause();
    audio = null;
  }
  currentPlayingTrack = null;
}

function setupPlayerEvents() {
  playerPlayBtn.onclick = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  };

  playerPrevBtn.onclick = playPrev;
  playerNextBtn.onclick = playNext;

  progressBarBg.onclick = (e) => {
    if (!audio) return;
    const rect = progressBarBg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audio.currentTime = percentage * audio.duration;
    updateProgressBar();
  };

  volumeSlider.onclick = (e) => {
    const rect = volumeSlider.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let percentage = clickX / rect.width;
    percentage = Math.max(0, Math.min(1, percentage));
    
    currentVolume = percentage;
    if (audio) audio.volume = currentVolume;
    volumeFill.style.width = `${percentage * 100}%`;
  };
}

function updateProgressBar() {
  if (!audio) return;
  const current = audio.currentTime;
  const duration = audio.duration || 30;
  const percent = (current / duration) * 100;
  
  progressBarFill.style.width = `${percent}%`;
  timeCurrent.textContent = formatTime(current);
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- FONCTIONS D'EXPORT & EFFACEMENT ---

// Exporte les playlists du LocalStorage sous format JSON téléchargeable
function exportPlaylistsToJSON() {
  if (Object.keys(playlists).length === 0) {
    alert("Aucune donnée à exporter.");
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(playlists, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "melomanie-export-playlists.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Efface toutes les données locales
function clearAllPlaylists() {
  if (confirm("Voulez-vous vraiment effacer toutes les playlists et commentaires enregistrés dans ce navigateur ? Cette action est irréversible.")) {
    if (isPlaying) pauseTrack();
    window.localStorage.removeItem('melomanie_playlists');
    window.localStorage.removeItem('melomanie_active_slug');
    playlists = {};
    activePlaylistSlug = '';
    playlistTracks = [];
    populatePlaylistSelector();
    showEmptyState(true);
    alert("Toutes vos données locales ont été effacées.");
  }
}

// Helper pour générer le picto combiné (Spotify Logo + Play Badge superposé)
function getSpotifyPlayComboSVG() {
  return `
    <span class="spotify-play-combo hover-cover-mode">
      <svg class="spotify-svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.669.47-.745 3.85-.88 7.15-.506 9.818 1.13.296.18.387.563.209.86zm1.224-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.077-1.182-.413.125-.845-.108-.97-.52-.125-.413.108-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.345.366.226.486.705.26 1.07zm.106-2.833C14.382 8.87 8.544 8.677 5.16 9.704c-.52.158-1.066-.144-1.224-.662-.158-.52.143-1.067.662-1.224 3.886-1.18 10.33-.96 14.39 1.45.47.28.623.89.344 1.357-.28.47-.89.622-1.358.344z"/>
      </svg>
      <span class="play-badge-overlay">
        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
      </span>
    </span>
  `;
}

// Helper pour générer des liens cliquables vers Spotify pour les artistes
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

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- TOGGLE DE VUE (CARTES / LISTE) ---
function setupViewModeToggle() {
  const gridBtn = document.getElementById('view-mode-grid');
  const listBtn = document.getElementById('view-mode-list');
  const gridContainer = document.getElementById('tracks-grid');

  if (!gridBtn || !listBtn || !gridContainer) return;

  function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem('melomanie_track_view_mode', mode);

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

  gridBtn.onclick = () => setViewMode('grid');
  listBtn.onclick = () => setViewMode('list');

  setViewMode(currentViewMode);
}

// --- MODALE DE RÉORGANISATION DES PLAYLISTS ---
let tempReorderSlugs = [];

function setupReorderModal() {
  const reorderBtn = document.getElementById('reorder-btn');
  const reorderModal = document.getElementById('reorder-modal');
  const closeBtn = document.getElementById('close-reorder-modal');
  const saveBtn = document.getElementById('save-reorder-btn');

  if (!reorderBtn || !reorderModal) return;

  reorderBtn.onclick = () => openReorderModal();
  if (closeBtn) closeBtn.onclick = () => reorderModal.classList.add('hidden');
  if (saveBtn) saveBtn.onclick = () => saveReorder();
}

function openReorderModal() {
  const reorderModal = document.getElementById('reorder-modal');
  tempReorderSlugs = getSortedPlaylistSlugs(playlists);
  renderReorderList();
  if (reorderModal) reorderModal.classList.remove('hidden');
}

function moveReorderItem(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= tempReorderSlugs.length) return;
  const temp = tempReorderSlugs[index];
  tempReorderSlugs[index] = tempReorderSlugs[newIndex];
  tempReorderSlugs[newIndex] = temp;
  renderReorderList();
}

function renderReorderList() {
  const container = document.getElementById('reorder-list-container');
  if (!container) return;

  container.innerHTML = tempReorderSlugs.map((slug, idx) => {
    const pl = playlists[slug];
    const trackCount = pl && pl.tracks ? pl.tracks.length : 0;
    const isFirst = idx === 0;
    const isLast = idx === tempReorderSlugs.length - 1;
    const name = pl ? pl.name : slug;

    return `
      <div class="reorder-item">
        <div class="reorder-item-title">
          <span>${idx + 1}.</span>
          <span>${name}</span>
          <span class="reorder-item-badge">(${trackCount} morceaux)</span>
        </div>
        <div class="reorder-btn-group">
          <button class="reorder-action-btn up-btn" data-idx="${idx}" ${isFirst ? 'disabled' : ''} title="Monter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
          </button>
          <button class="reorder-action-btn down-btn" data-idx="${idx}" ${isLast ? 'disabled' : ''} title="Descendre">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.up-btn').forEach(btn => {
    btn.onclick = () => moveReorderItem(parseInt(btn.getAttribute('data-idx')), -1);
  });

  container.querySelectorAll('.down-btn').forEach(btn => {
    btn.onclick = () => moveReorderItem(parseInt(btn.getAttribute('data-idx')), 1);
  });
}

async function saveReorder() {
  tempReorderSlugs.forEach((slug, idx) => {
    if (playlists[slug]) {
      playlists[slug].order = idx + 1;
    }
  });

  savePlaylistsData();
  populatePlaylistSelector();
  const reorderModal = document.getElementById('reorder-modal');
  if (reorderModal) reorderModal.classList.add('hidden');

  // Mise à jour synchrone du site statique
  try {
    await fetch('/api/export-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlists)
    });
  } catch (e) {
    console.warn("Mise à jour SSG locale :", e);
  }
}

// --- VUE CATALOGUE GLOBALE ---
function showCatalogView() {
  const singleView = document.getElementById('single-playlist-view');
  const catalogView = document.getElementById('catalog-view');
  if (!singleView || !catalogView) return;

  singleView.classList.add('hidden');
  catalogView.classList.remove('hidden');
  if (playlistSelect) playlistSelect.value = 'all';
  renderCatalogGrid();
}

function showSinglePlaylistView(slug) {
  const singleView = document.getElementById('single-playlist-view');
  const catalogView = document.getElementById('catalog-view');
  if (!singleView || !catalogView) return;

  catalogView.classList.add('hidden');
  singleView.classList.remove('hidden');
  
  if (slug) {
    switchPlaylist(slug);
  }
}

function getPlaylistCoverImage(pl) {
  if (!pl) return '';
  if (pl.coverImage) return pl.coverImage;
  if (pl.image) return pl.image;
  if (Array.isArray(pl.tracks) && pl.tracks.length > 0 && pl.tracks[0].image) return pl.tracks[0].image;
  return '';
}

function renderCatalogGrid() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  const sortedSlugs = getSortedPlaylistSlugs(playlists);

  if (sortedSlugs.length === 0) {
    grid.innerHTML = `
      <div class="empty-state double-bezel-shell" style="grid-column: 1 / -1;">
        <div class="double-bezel-core empty-state-inner">
          <h3 class="empty-state-title">Aucune playlist disponible</h3>
          <p class="empty-state-desc">Importez une playlist Spotify depuis la barre d'en-tête pour commencer.</p>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = sortedSlugs.map((slug, idx) => {
    const pl = playlists[slug];
    const trackCount = pl && pl.tracks ? pl.tracks.length : 0;
    const desc = pl && pl.description ? pl.description : "Aucune description fournie.";
    const isFirst = idx === 0;
    const isLast = idx === sortedSlugs.length - 1;
    const name = pl ? pl.name : slug;
    const coverUrl = getPlaylistCoverImage(pl);

    const coverHTML = coverUrl
      ? `<div class="catalog-card-cover-wrapper"><img src="${coverUrl}" alt="${escapeHTML(name)}" class="catalog-card-cover-img" loading="lazy"></div>`
      : `<div class="catalog-card-cover-wrapper"><div class="catalog-card-cover-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div></div>`;

    return `
      <div class="catalog-card">
        ${coverHTML}
        <div class="catalog-card-body">
          <div>
            <div class="catalog-card-header">
              <h2 class="catalog-card-title">${escapeHTML(name)}</h2>
              <span class="catalog-card-badge">${trackCount} morceaux</span>
            </div>
            <p class="catalog-card-desc">${escapeHTML(desc)}</p>
          </div>
          <div class="catalog-card-footer">
            <div class="catalog-card-actions">
              <button class="nav-action-pill highlight open-playlist-btn" data-slug="${slug}" title="Ouvrir la playlist">
                <span>Ouvrir</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;margin-left:2px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
              <button class="reorder-action-btn move-up-btn" data-slug="${slug}" data-idx="${idx}" ${isFirst ? 'disabled' : ''} title="Monter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
              <button class="reorder-action-btn move-down-btn" data-slug="${slug}" data-idx="${idx}" ${isLast ? 'disabled' : ''} title="Descendre">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            </div>
            <button class="icon-btn-subtle delete-playlist-btn" data-slug="${slug}" title="Supprimer la playlist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Binder les événements sur les boutons des cartes
  grid.querySelectorAll('.open-playlist-btn').forEach(btn => {
    btn.onclick = () => showSinglePlaylistView(btn.getAttribute('data-slug'));
  });

  grid.querySelectorAll('.move-up-btn').forEach(btn => {
    btn.onclick = () => moveCatalogPlaylistOrder(parseInt(btn.getAttribute('data-idx')), -1);
  });

  grid.querySelectorAll('.move-down-btn').forEach(btn => {
    btn.onclick = () => moveCatalogPlaylistOrder(parseInt(btn.getAttribute('data-idx')), 1);
  });

  grid.querySelectorAll('.delete-playlist-btn').forEach(btn => {
    btn.onclick = () => deleteCatalogPlaylist(btn.getAttribute('data-slug'));
  });
}

async function moveCatalogPlaylistOrder(index, direction) {
  const sortedSlugs = getSortedPlaylistSlugs(playlists);
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= sortedSlugs.length) return;

  const temp = sortedSlugs[index];
  sortedSlugs[index] = sortedSlugs[newIndex];
  sortedSlugs[newIndex] = temp;

  sortedSlugs.forEach((slug, idx) => {
    if (playlists[slug]) {
      playlists[slug].order = idx + 1;
    }
  });

  savePlaylistsData();
  populatePlaylistSelector();
  renderCatalogGrid();

  // Synchro SSG locale
  try {
    await fetch('/api/export-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlists)
    });
  } catch (e) {
    console.warn("Mise à jour SSG :", e);
  }
}

function deleteCatalogPlaylist(slug) {
  const pl = playlists[slug];
  if (!pl) return;
  if (confirm(`Voulez-vous vraiment supprimer la playlist "${pl.name}" ?`)) {
    delete playlists[slug];
    savePlaylistsData();
    const sortedSlugs = getSortedPlaylistSlugs(playlists);
    if (activePlaylistSlug === slug) {
      activePlaylistSlug = sortedSlugs.length > 0 ? sortedSlugs[0] : '';
    }
    populatePlaylistSelector();
    renderCatalogGrid();
  }
}

// Démarrer au chargement
window.addEventListener('DOMContentLoaded', init);

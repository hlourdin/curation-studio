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

// Variables d'état global
let playlists = {};
let activePlaylistSlug = '';
let currentPlayingTrack = null;
let isPlaying = false;
let audio = null;
let playlistTracks = [];

// DOM Cache - Écrans
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const spotifyLoginBtn = document.getElementById('spotify-login-btn');

// DOM Cache - Contôles Playlist & Navbar
const playlistSelect = document.getElementById('playlist-select');
const playlistName = document.getElementById('playlist-name');
const playlistDescription = document.getElementById('playlist-description');
const playlistSpotifyLink = document.getElementById('playlist-spotify-link');
const playlistEditionTag = document.getElementById('playlist-edition-tag');
const tracksGrid = document.getElementById('tracks-grid');
const loadingOrEmpty = document.getElementById('loading-or-empty');

const playlistInput = document.getElementById('playlist-input');
const importBtn = document.getElementById('import-btn');
const logoutBtn = document.getElementById('logout-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const clearDataBtn = document.getElementById('clear-data-btn');

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

// Initialisation de l'application
async function init() {
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

  // Événements d'importation
  importBtn.onclick = () => handleImport(token);
  playlistInput.onkeydown = (e) => {
    if (e.key === 'Enter') handleImport(token);
  };

  // Événement déconnexion
  logoutBtn.onclick = () => {
    if (isPlaying) pauseTrack();
    logout();
    showLoginScreen(true);
  };

  // Événements d'export & d'effacement
  exportJsonBtn.onclick = () => exportPlaylistsToJSON();
  clearDataBtn.onclick = () => clearAllPlaylists();

  // Événement de changement de playlist
  playlistSelect.onchange = (e) => {
    switchPlaylist(e.target.value);
  };

  // Lecteur audio
  setupPlayerEvents();

  // Remplir le sélecteur
  populatePlaylistSelector();

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
  } else {
    // Fallback sur les données du fichier local (s'il y en a)
    const hasDefaultData = Object.keys(defaultPlaylistsData).length > 0;
    if (hasDefaultData) {
      playlists = defaultPlaylistsData;
    } else {
      playlists = {};
    }
  }

  // Définir la playlist active par défaut
  const slugs = Object.keys(playlists);
  if (slugs.length > 0) {
    // On charge le dernier ou le premier
    activePlaylistSlug = window.localStorage.getItem('melomanie_active_slug') || slugs[0];
    if (!playlists[activePlaylistSlug]) {
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

// Rplit le sélecteur de saisons/playlists dans l'en-tête
function populatePlaylistSelector() {
  playlistSelect.innerHTML = '';
  const slugs = Object.keys(playlists);

  if (slugs.length === 0) {
    playlistSelect.closest('.playlist-selector-wrapper').classList.add('hidden');
    return;
  }

  playlistSelect.closest('.playlist-selector-wrapper').classList.remove('hidden');
  
  slugs.forEach(slug => {
    const option = document.createElement('option');
    option.value = slug;
    option.textContent = playlists[slug].name;
    playlistSelect.appendChild(option);
  });

  playlistSelect.value = activePlaylistSlug;
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

// Change la playlist active
function switchPlaylist(slug) {
  if (isPlaying) {
    pauseTrack();
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
  playlistDescription.textContent = data.description || "Aucune description fournie par Spotify.";
  playlistSpotifyLink.href = data.spotifyUrl;
  playlistEditionTag.textContent = data.name;

  // Si on lit un morceau qui ne fait pas partie de cette playlist, on cache le lecteur
  if (currentPlayingTrack && !playlistTracks.some(t => t.id === currentPlayingTrack.id)) {
    hideGlobalPlayer();
  }

  // Rendre les cartes de morceaux
  renderTracks(playlistTracks);
}

// Affiche ou masque l'état vide
function showEmptyState(show) {
  if (show) {
    tracksGrid.classList.add('hidden');
    loadingOrEmpty.classList.remove('hidden');
    document.getElementById('hero-area').classList.add('hidden');
  } else {
    tracksGrid.classList.remove('hidden');
    loadingOrEmpty.classList.add('hidden');
    document.getElementById('hero-area').classList.remove('hidden');
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

  tracks.forEach((track) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.id = `card-${track.id}`;
    
    const isCurrent = currentPlayingTrack && currentPlayingTrack.id === track.id;
    if (isCurrent && isPlaying) {
      card.classList.add('playing');
    }

    // Bouton d'écoute ou icône Spotify
    let playIconSVG = '';
    if (isCurrent && isPlaying) {
      playIconSVG = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    } else if (track.previewUrl) {
      playIconSVG = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    } else {
      playIconSVG = `<svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.669.47-.745 3.85-.88 7.15-.506 9.818 1.13.296.18.387.563.209.86zm1.224-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.077-1.182-.413.125-.845-.108-.97-.52-.125-.413.108-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.345.366.226.486.705.26 1.07zm.106-2.833C14.382 8.87 8.544 8.677 5.16 9.704c-.52.158-1.066-.144-1.224-.662-.158-.52.143-1.067.662-1.224 3.886-1.18 10.33-.96 14.39 1.45.47.28.623.89.344 1.357-.28.47-.89.622-1.358.344z"/></svg>`;
    }

    card.innerHTML = `
      <div class="album-art-wrapper">
        <img class="album-art" src="${track.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="${track.album}" loading="lazy">
        <div class="play-overlay">
          <button class="play-card-btn" data-id="${track.id}" title="${track.previewUrl ? 'Écouter un extrait' : 'Écouter le morceau entier sur Spotify'}">
            ${playIconSVG}
          </button>
        </div>
      </div>
      <div class="song-info">
        <div class="song-title-row">
          <h3 class="song-title" title="${track.title}">${track.title}</h3>
          <a href="${track.url}" target="_blank" class="spotify-link-icon" title="Écouter sur Spotify">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.669.47-.745 3.85-.88 7.15-.506 9.818 1.13.296.18.387.563.209.86zm1.224-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.077-1.182-.413.125-.845-.108-.97-.52-.125-.413.108-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.345.366.226.486.705.26 1.07zm.106-2.833C14.382 8.87 8.544 8.677 5.16 9.704c-.52.158-1.066-.144-1.224-.662-.158-.52.143-1.067.662-1.224 3.886-1.18 10.33-.96 14.39 1.45.47.28.623.89.344 1.357-.28.47-.89.622-1.358.344z"/></svg>
          </a>
        </div>
        <p class="song-artist" title="${track.artist}">${track.artist}</p>
        <p class="song-album" title="${track.album}">${track.album}</p>
      </div>
      <div class="comment-container" id="comment-container-${track.id}">
        <!-- Injecté dynamiquement selon la présence d'un commentaire -->
      </div>
    `;

    // Événement d'écoute
    const playBtn = card.querySelector('.play-card-btn');
    playBtn.onclick = (e) => {
      e.stopPropagation();
      handlePlayClick(track);
    };

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
    box.innerHTML = `${track.comment}`;
    box.onclick = () => enterEditCommentMode(track, wrapper);
    wrapper.appendChild(box);
  } else {
    // Mode "+ Ajouter un commentaire"
    const addBtn = document.createElement('button');
    addBtn.className = 'add-comment-trigger-btn';
    addBtn.textContent = '+ Ajouter une note ou critique';
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
    if (!track.previewUrl) {
      // Pas d'extrait audio disponible, ouvrir sur Spotify
      window.open(track.url, '_blank');
      return;
    }
    selectAndPlayTrack(track);
  }
}

// Lance la lecture d'un nouveau morceau
function selectAndPlayTrack(track) {
  if (currentPlayingTrack) {
    const oldCard = document.getElementById(`card-${currentPlayingTrack.id}`);
    if (oldCard) {
      oldCard.classList.remove('playing');
      updateCardPlayButton(oldCard, false);
    }
  }

  currentPlayingTrack = track;
  isPlaying = true;

  if (audio) {
    audio.pause();
  }

  audio = new Audio(track.previewUrl);
  audio.volume = currentVolume;

  audio.addEventListener('timeupdate', updateProgressBar);
  audio.addEventListener('loadedmetadata', () => {
    timeDuration.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('ended', () => {
    playNext();
  });

  playerArt.src = track.image || '';
  playerTitle.textContent = track.title;
  playerArtist.textContent = track.artist;
  playerSpotifyLinkIcon.href = track.url;
  
  globalPlayer.classList.add('visible');

  const newCard = document.getElementById(`card-${track.id}`);
  if (newCard) {
    newCard.classList.add('playing');
    updateCardPlayButton(newCard, true);
  }

  audio.play().catch(e => {
    console.error("Échec de la lecture :", e);
    isPlaying = false;
    if (newCard) newCard.classList.remove('playing');
    updateGlobalPlayerUI();
  });

  updateGlobalPlayerUI();
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
  let nextIndex = currentIndex + 1;

  while (nextIndex < playlistTracks.length) {
    if (playlistTracks[nextIndex].previewUrl) {
      selectAndPlayTrack(playlistTracks[nextIndex]);
      return;
    }
    nextIndex++;
  }
  
  pauseTrack();
}

function playPrev() {
  if (!currentPlayingTrack || playlistTracks.length === 0) return;
  const currentIndex = playlistTracks.findIndex(t => t.id === currentPlayingTrack.id);
  let prevIndex = currentIndex - 1;

  while (prevIndex >= 0) {
    if (playlistTracks[prevIndex].previewUrl) {
      selectAndPlayTrack(playlistTracks[prevIndex]);
      return;
    }
    prevIndex--;
  }
}

function updateCardPlayButton(cardElement, playing) {
  const btn = cardElement.querySelector('.play-card-btn');
  if (btn) {
    if (playing) {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    }
  }
}

function updateGlobalPlayerUI() {
  if (isPlaying) {
    playerPlayIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
  } else {
    playerPlayIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
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

// --- UTILITAIRES ---

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

// Démarrer au chargement
window.addEventListener('DOMContentLoaded', init);

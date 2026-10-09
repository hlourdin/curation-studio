const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'c02cddea8b654e68b14633346c93cc78';
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin;
const SCOPES = 'playlist-read-private playlist-read-collaborative';

// Génère une chaîne aléatoire pour le Code Verifier
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

// Calcule le SHA-256 du Code Verifier et l'encode en Base64 URL
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Redirige l'utilisateur vers la page de connexion Spotify
export async function redirectToSpotifyAuth() {
  if (!CLIENT_ID) throw new Error('SPOTIFY_CLIENT_ID_MISSING');
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  window.localStorage.setItem('spotify_code_verifier', codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: SCOPES,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Échange le code d'autorisation contre des tokens d'accès
export async function getAccessToken(code) {
  const codeVerifier = window.localStorage.getItem('spotify_code_verifier');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erreur lors de l'échange de token : ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  storeTokens(data);
  return data.access_token;
}

// Rafraîchit le token d'accès
export async function refreshAccessToken() {
  const refreshToken = window.localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) {
    throw new Error("Aucun refresh token disponible.");
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    // Si le refresh échoue, on vide le stockage pour forcer une reconnexion
    logout();
    throw new Error(`Impossible de rafraîchir le token.`);
  }

  const data = await response.json();
  storeTokens(data);
  return data.access_token;
}

// Stocke les tokens dans localStorage
function storeTokens(data) {
  window.localStorage.setItem('spotify_access_token', data.access_token);
  if (data.refresh_token) {
    window.localStorage.setItem('spotify_refresh_token', data.refresh_token);
  }
  // Expiration dans X secondes (on convertit en timestamp ms)
  const expiresAt = Date.now() + (data.expires_in * 1000);
  window.localStorage.setItem('spotify_expires_at', expiresAt);
}

// Déconnecter l'utilisateur
export function logout() {
  window.localStorage.removeItem('spotify_access_token');
  window.localStorage.removeItem('spotify_refresh_token');
  window.localStorage.removeItem('spotify_expires_at');
  window.localStorage.removeItem('spotify_code_verifier');
}

export function getStoredSpotifyRefreshToken() {
  return window.localStorage.getItem('spotify_refresh_token');
}

// Vérifie si l'utilisateur est connecté et rafraîchit le token si nécessaire
export async function getValidAccessToken() {
  const token = window.localStorage.getItem('spotify_access_token');
  const expiresAt = window.localStorage.getItem('spotify_expires_at');

  if (!token || !expiresAt) {
    return null;
  }

  // Si le token expire dans moins de 5 minutes, on le rafraîchit
  if (Date.now() > (Number(expiresAt) - 5 * 60 * 1000)) {
    try {
      return await refreshAccessToken();
    } catch (e) {
      console.error("Échec du rafraîchissement automatique du token :", e);
      return null;
    }
  }

  return token;
}

function releaseYearFromDate(releaseDate) {
  if (!releaseDate || typeof releaseDate !== 'string') return '';
  const year = releaseDate.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : '';
}

async function fetchAlbumLabels(albumIds, token) {
  const labels = new Map();
  const uniqueIds = [...new Set(albumIds.filter(Boolean))];
  if (uniqueIds.length === 0) return labels;

  const headers = { Authorization: `Bearer ${token}` };

  for (let i = 0; i < uniqueIds.length; i += 20) {
    const batch = uniqueIds.slice(i, i + 20);
    const res = await fetch(`https://api.spotify.com/v1/albums?ids=${batch.join(',')}`, { headers });
    if (!res.ok) {
      console.warn(`Impossible de récupérer les labels album (${res.status})`);
      continue;
    }
    const data = await res.json();
    (data.albums || []).forEach((album) => {
      if (album?.id) {
        labels.set(album.id, album.label || '');
      }
    });
  }

  return labels;
}

// Extraire l'ID de la playlist à partir d'une URL
export function extractPlaylistId(urlOrId) {
  if (!urlOrId) return '';
  const match = urlOrId.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : urlOrId.trim();
}

// Récupère les détails d'une playlist et paginer tous ses morceaux
export async function fetchSpotifyPlaylist(playlistId, token) {
  const headers = {
    'Authorization': `Bearer ${token}`
  };

  // 1. Récupérer les métadonnées principales (sans filtre fields pour être 100% robuste)
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Playlist introuvable ou erreur API (status ${res.status}) : ${errorBody}`);
  }

  const playlistInfo = await res.json();
  console.log("Spotify API Response:", playlistInfo);
  
  let tracksItems = [];
  let nextUrl = null;

  if (playlistInfo.tracks) {
    tracksItems = playlistInfo.tracks.items || [];
    nextUrl = playlistInfo.tracks.next;
  } else if (playlistInfo.items) {
    if (Array.isArray(playlistInfo.items)) {
      tracksItems = playlistInfo.items;
      nextUrl = null;
    } else {
      tracksItems = playlistInfo.items.items || [];
      nextUrl = playlistInfo.items.next || null;
    }
  } else {
    const keys = playlistInfo ? Object.keys(playlistInfo).join(', ') : 'null';
    throw new Error(`Données de playlist invalides. Impossible de trouver la liste des morceaux. Champs reçus : [${keys}].`);
  }

  // 2. Paginer les morceaux supplémentaires s'il y en a (> 100 morceaux)
  while (nextUrl) {
    const nextRes = await fetch(nextUrl, { headers });
    if (nextRes.ok) {
      const nextData = await nextRes.json();
      tracksItems = tracksItems.concat(nextData.items);
      nextUrl = nextData.next;
    } else {
      const errorBody = await nextRes.text();
      throw new Error(`IMPORT_INCOMPLETE: pagination Spotify interrompue (${nextRes.status}) ${errorBody}`);
    }
  }

  // 3. Formater les morceaux
  const formattedTracks = tracksItems
    .map(item => {
      // Gérer le cas où le morceau est dans 'item.item' (nouveau format), 'item.track' (classique) ou directement 'item' (plat)
      if (item.item) return item.item;
      if (item.track) return item.track;
      return item;
    })
    .map(t => {
      const album = t.album || null;
      return {
        id: t.id,
        title: t.name,
        artist: t.artists ? t.artists.map(a => a.name).join(', ') : '',
        artists: t.artists ? t.artists.map(a => ({
          name: a.name,
          url: a.external_urls?.spotify || (a.id ? `https://open.spotify.com/artist/${a.id}` : `https://open.spotify.com/search/${encodeURIComponent(a.name)}`)
        })) : [],
        album: album ? album.name : '',
        albumId: album?.id || '',
        year: album?.release_date ? releaseYearFromDate(album.release_date) : '',
        label: '',
        image: album && album.images && album.images.length > 0 ? album.images[0].url : '',
        url: t.external_urls?.spotify || '',
        previewUrl: t.preview_url || '',
        comment: '' // Sera complété par l'utilisateur
      };
    });

  const labelMap = await fetchAlbumLabels(formattedTracks.map((track) => track.albumId), token);
  formattedTracks.forEach((track) => {
    if (track.albumId && labelMap.has(track.albumId)) {
      track.label = labelMap.get(track.albumId) || '';
    }
    delete track.albumId;
  });

  console.log(`Tracks items parsed: ${tracksItems.length}, formatted: ${formattedTracks.length}`);

  return {
    id: playlistId,
    name: playlistInfo.name,
    description: playlistInfo.description || '',
    snapshotId: playlistInfo.snapshot_id || null,
    coverImage: playlistInfo.images?.[0]?.url || '',
    spotifyUrl: playlistInfo.external_urls?.spotify || `https://open.spotify.com/playlist/${playlistId}`,
    tracks: formattedTracks
  };
}

/** Complète année et label pour des morceaux déjà stockés (sans ré-import complet). */
export async function enrichTracksMetadata(tracks, token) {
  if (!token || !Array.isArray(tracks) || tracks.length === 0) return false;

  const targets = tracks.filter(
    (t) => t?.id && (!String(t.year || '').trim() || !String(t.label || '').trim())
  );
  if (targets.length === 0) return false;

  const headers = { Authorization: `Bearer ${token}` };
  const byId = new Map(tracks.map((t) => [t.id, t]));
  let changed = false;

  for (let i = 0; i < targets.length; i += 50) {
    const batch = targets.slice(i, i + 50);
    const res = await fetch(
      `https://api.spotify.com/v1/tracks?ids=${batch.map((t) => t.id).join(',')}`,
      { headers }
    );
    if (!res.ok) {
      console.warn(`Enrichissement morceaux (${res.status})`);
      continue;
    }

    const data = await res.json();
    const albumIdsForLabels = new Set();

    for (const spotifyTrack of data.tracks || []) {
      if (!spotifyTrack?.id) continue;
      const track = byId.get(spotifyTrack.id);
      if (!track) continue;

      const album = spotifyTrack.album;
      if (!String(track.year || '').trim() && album?.release_date) {
        const year = releaseYearFromDate(album.release_date);
        if (year) {
          track.year = year;
          changed = true;
        }
      }
      if (!String(track.label || '').trim() && album?.id) {
        track.__albumIdForLabel = album.id;
        albumIdsForLabels.add(album.id);
      }
    }

    if (albumIdsForLabels.size > 0) {
      const labelMap = await fetchAlbumLabels([...albumIdsForLabels], token);
      for (const track of batch) {
        const albumId = track.__albumIdForLabel;
        delete track.__albumIdForLabel;
        if (!albumId || String(track.label || '').trim()) continue;
        const label = labelMap.get(albumId) || '';
        if (label) {
          track.label = label;
          changed = true;
        }
      }
    }
  }

  return changed;
}

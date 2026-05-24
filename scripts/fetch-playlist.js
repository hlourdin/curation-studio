import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const CONFIG_PATH = path.resolve('src/data/config.json');
const DATA_PATH = path.resolve('src/data/playlists-data.json');

// Morceaux de démo au cas où les clés Spotify ne sont pas configurées
const MOCK_PLAYLISTS = {
  "spring-summer-2026": {
    "id": "demo-spring-summer-2026",
    "name": "Spring/Summer 2026 (Démo)",
    "description": "Une sélection de mes plus belles découvertes musicales pour le premier semestre 2026.",
    "spotifyUrl": "https://open.spotify.com",
    "tracks": [
      {
        "id": "demo-track-1",
        "title": "Midnight City",
        "artist": "M83",
        "album": "Hurry Up, We're Dreaming",
        "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60",
        "url": "https://open.spotify.com",
        "previewUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "comment": "Un classique indémodable. Le solo de saxo à la fin me donne toujours des frissons !"
      },
      {
        "id": "demo-track-2",
        "title": "Tame Impala",
        "artist": "The Less I Know The Better",
        "album": "Currents",
        "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60",
        "url": "https://open.spotify.com",
        "previewUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        "comment": "La ligne de basse est tout simplement addictive. Découvert tardivement mais écouté en boucle tout l'été."
      },
      {
        "id": "demo-track-3",
        "title": "Breathe",
        "artist": "Pink Floyd",
        "album": "The Dark Side of the Moon",
        "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
        "url": "https://open.spotify.com",
        "previewUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        "comment": "Redécouvert en vinyle chez un ami. Une immersion sonore totale et intemporelle."
      },
      {
        "id": "demo-track-4",
        "title": "Starboy",
        "artist": "The Weeknd ft. Daft Punk",
        "album": "Starboy",
        "image": "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=60",
        "url": "https://open.spotify.com",
        "previewUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        "comment": "La collaboration parfaite. Le rythme sombre et lourd convient parfaitement aux trajets nocturnes."
      }
    ]
  }
};

// Utilitaire pour nettoyer les chaînes de caractères pour les slugs
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/\s+/g, '-')           // Remplacer les espaces par -
    .replace(/[^\w\-]+/g, '')       // Supprimer les caractères spéciaux
    .replace(/\-\-+/g, '-')         // Remplacer les doubles -
    .replace(/^-+/, '')             // Supprimer les - au début
    .replace(/-+$/, '');            // Supprimer les - à la fin
}

// Récupérer le token Spotify via Client Credentials Flow
async function getSpotifyToken(clientId, clientSecret) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur lors de la récupération du token Spotify: ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Extraire l'ID de la playlist depuis une URL ou une chaîne brute
function extractPlaylistId(input) {
  if (!input) return null;
  // Format d'URL Spotify : https://open.spotify.com/playlist/ID?si=...
  const match = input.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : input.trim();
}

// Récupérer les détails d'une playlist et ses morceaux
async function fetchPlaylistData(playlistId, token) {
  const headers = {
    'Authorization': `Bearer ${token}`
  };

  // 1. Récupérer les métadonnées de la playlist
  const playlistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,external_urls,images,tracks`, { headers });
  if (!playlistRes.ok) {
    const errorBody = await playlistRes.text();
    throw new Error(`Erreur lors de la récupération de la playlist: ${playlistRes.status} ${playlistRes.statusText} - ${errorBody}`);
  }
  const playlistInfo = await playlistRes.json();

  // 2. Paginer pour récupérer tous les morceaux si nécessaire
  let tracks = playlistInfo.tracks.items;
  let nextUrl = playlistInfo.tracks.next;

  while (nextUrl) {
    console.log(`Récupération de la page suivante des morceaux...`);
    const nextRes = await fetch(nextUrl, { headers });
    if (nextRes.ok) {
      const nextData = await nextRes.json();
      tracks = tracks.concat(nextData.items);
      nextUrl = nextData.next;
    } else {
      console.warn(`Impossible de charger la page suivante: ${nextRes.statusText}`);
      break;
    }
  }

  // 3. Formater les morceaux
  const formattedTracks = tracks
    .filter(item => item.track) // ignorer les éléments vides ou nuls
    .map(item => {
      const t = item.track;
      return {
        id: t.id,
        title: t.name,
        artist: t.artists.map(a => a.name).join(', '),
        album: t.album.name,
        image: t.album.images && t.album.images.length > 0 ? t.album.images[0].url : '',
        url: t.external_urls?.spotify || '',
        previewUrl: t.preview_url || '',
        comment: '' // Rempli plus tard
      };
    });

  return {
    id: playlistId,
    name: playlistInfo.name,
    description: playlistInfo.description || '',
    spotifyUrl: playlistInfo.external_urls?.spotify || `https://open.spotify.com/playlist/${playlistId}`,
    tracks: formattedTracks
  };
}

async function main() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const args = process.argv.slice(2);
  const targetPlaylistInput = args[0];

  // S'assurer que les répertoires existent
  const dataDir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Charger la configuration actuelle
  let config = { playlists: [] };
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (e) {
      console.warn("Impossible de lire config.json, réinitialisation.");
    }
  }

  // Charger les données de playlists existantes
  let existingPlaylists = {};
  if (fs.existsSync(DATA_PATH)) {
    try {
      existingPlaylists = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    } catch (e) {
      console.warn("Impossible de lire playlists-data.json, réinitialisation.");
    }
  }

  // Mode Démo si pas de clés API
  if (!clientId || !clientSecret) {
    console.log("======================================================================");
    console.log("⚠️ Spotify API credentials (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET) manquants.");
    console.log("Génération de données de démo pour vous permettre de tester le site.");
    console.log("Pour utiliser vos propres playlists, créez un fichier .env avec :");
    console.log("SPOTIFY_CLIENT_ID=votre_client_id");
    console.log("SPOTIFY_CLIENT_SECRET=votre_client_secret");
    console.log("======================================================================");

    // Écrire les données de démo
    fs.writeFileSync(DATA_PATH, JSON.stringify(MOCK_PLAYLISTS, null, 2), 'utf-8');
    
    // Configurer avec la playlist de démo si vide
    const hasDemo = config.playlists.some(p => p.slug === 'spring-summer-2026');
    if (!hasDemo) {
      config.playlists.push({
        id: "demo-spring-summer-2026",
        name: "Spring/Summer 2026 (Démo)",
        slug: "spring-summer-2026"
      });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    }
    
    console.log(`✅ Fichier démo généré avec succès dans : ${DATA_PATH}`);
    return;
  }

  try {
    console.log("Connexion à l'API Spotify...");
    const token = await getSpotifyToken(clientId, clientSecret);
    console.log("Authentification réussie !");

    let playlistsToFetch = [];

    if (targetPlaylistInput) {
      const playlistId = extractPlaylistId(targetPlaylistInput);
      if (!playlistId) {
        console.error("URL ou ID de playlist invalide.");
        process.exit(1);
      }
      console.log(`Récupération de la playlist spécifiée : ${playlistId}...`);
      const playlistData = await fetchPlaylistData(playlistId, token);
      
      const slug = slugify(playlistData.name);
      
      // Mettre à jour config.json
      const existingConfigIndex = config.playlists.findIndex(p => p.id === playlistId || p.slug === slug);
      if (existingConfigIndex > -1) {
        config.playlists[existingConfigIndex] = {
          id: playlistId,
          name: playlistData.name,
          slug: slug
        };
      } else {
        config.playlists.push({
          id: playlistId,
          name: playlistData.name,
          slug: slug
        });
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
      
      playlistsToFetch.push({
        id: playlistId,
        slug: slug,
        playlistData: playlistData
      });
    } else {
      // Récupérer toutes les playlists configurées
      if (config.playlists.length === 0) {
        console.log("Aucune playlist configurée dans config.json. Veuillez en spécifier une :");
        console.log("npm run fetch <URL-de-votre-playlist>");
        process.exit(0);
      }

      console.log(`Récupération des ${config.playlists.length} playlists configurées...`);
      for (const p of config.playlists) {
        // Ignorer les IDs de démo si on a des clés API valides
        if (p.id.startsWith('demo-')) continue;
        
        try {
          console.log(`Récupération de : ${p.name} (${p.id})...`);
          const playlistData = await fetchPlaylistData(p.id, token);
          playlistsToFetch.push({
            id: p.id,
            slug: p.slug,
            playlistData: playlistData
          });
        } catch (err) {
          console.error(`Erreur lors du traitement de ${p.name}:`, err.message);
        }
      }
    }

    // Traiter et fusionner les données
    for (const item of playlistsToFetch) {
      const { slug, playlistData } = item;
      const oldPlaylist = existingPlaylists[slug];

      if (oldPlaylist && oldPlaylist.tracks) {
        console.log(`Fusion des commentaires existants pour l'édition : ${playlistData.name}`);
        
        // Créer une map des commentaires existants
        const commentMap = new Map();
        oldPlaylist.tracks.forEach(track => {
          if (track.comment) {
            // Associer par ID de morceau
            commentMap.set(track.id, track.comment);
            // Associer aussi par titre + artiste au cas où l'ID changerait
            commentMap.set(`${track.title.toLowerCase()}-${track.artist.toLowerCase()}`, track.comment);
          }
        });

        // Appliquer les commentaires aux nouveaux morceaux récupérés
        playlistData.tracks.forEach(track => {
          if (commentMap.has(track.id)) {
            track.comment = commentMap.get(track.id);
          } else {
            const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`;
            if (commentMap.has(key)) {
              track.comment = commentMap.get(key);
            }
          }
        });
      }

      existingPlaylists[slug] = playlistData;
    }

    // Supprimer les démos si on a de vraies données maintenant
    if (config.playlists.some(p => !p.id.startsWith('demo-'))) {
      delete existingPlaylists['spring-summer-2026'];
      // Enlever la démo du config si nécessaire
      config.playlists = config.playlists.filter(p => !p.id.startsWith('demo-'));
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    }

    // Sauvegarder les données mises à jour
    fs.writeFileSync(DATA_PATH, JSON.stringify(existingPlaylists, null, 2), 'utf-8');
    console.log(`\n🎉 Récupération et fusion terminées avec succès !`);
    console.log(`Données sauvegardées dans : ${DATA_PATH}`);
    console.log(`Vous pouvez maintenant ouvrir ce fichier pour ajouter vos commentaires.`);

  } catch (error) {
    console.error("❌ Une erreur est survenue :", error.message);
    process.exit(1);
  }
}

main();

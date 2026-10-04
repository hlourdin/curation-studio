export async function refreshSpotifyAccessToken(refreshToken) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) throw new Error('SPOTIFY_CLIENT_ID_MISSING');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const error = new Error(response.status === 400 ? 'SPOTIFY_RECONNECT_REQUIRED' : 'SPOTIFY_REFRESH_FAILED');
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

export async function fetchCompleteSpotifyPlaylist(playlistId, accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, { headers });
  if (!response.ok) throw new Error(`SPOTIFY_PLAYLIST_${response.status}`);

  const info = await response.json();
  const items = [...(info.tracks?.items || [])];
  let next = info.tracks?.next;

  while (next) {
    const pageResponse = await fetch(next, { headers });
    if (!pageResponse.ok) throw new Error(`IMPORT_INCOMPLETE_${pageResponse.status}`);
    const page = await pageResponse.json();
    items.push(...(page.items || []));
    next = page.next;
  }

  const seen = new Map();
  const tracks = items
    .map(item => item.item || item.track || item)
    .filter(track => track?.id && track?.name)
    .map(track => {
      const occurrence = (seen.get(track.id) || 0) + 1;
      seen.set(track.id, occurrence);
      return {
        id: track.id,
        occurrenceKey: `${track.id}:${occurrence}`,
        title: track.name,
        artist: (track.artists || []).map(artist => artist.name).join(', '),
        artists: (track.artists || []).map(artist => ({
          name: artist.name,
          url: artist.external_urls?.spotify || ''
        })),
        album: track.album?.name || '',
        image: track.album?.images?.[0]?.url || '',
        url: track.external_urls?.spotify || '',
        previewUrl: track.preview_url || ''
      };
    });

  if (tracks.length !== items.filter(item => (item.item || item.track || item)?.id).length) {
    throw new Error('IMPORT_INCOMPLETE_INVALID_TRACKS');
  }

  return {
    id: playlistId,
    name: info.name,
    description: info.description || '',
    snapshotId: info.snapshot_id || null,
    coverImage: info.images?.[0]?.url || '',
    spotifyUrl: info.external_urls?.spotify || '',
    tracks
  };
}

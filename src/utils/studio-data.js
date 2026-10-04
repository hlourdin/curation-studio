import { supabase } from './supabase.js';

function requireClient() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  return supabase;
}

function playlistFromRow(row) {
  const tracks = (row.playlist_items || [])
    .filter(item => !item.removed_from_source)
    .sort((a, b) => a.position - b.position)
    .map(item => ({
      id: item.spotify_track_id || item.occurrence_key,
      title: item.title,
      artist: item.artist,
      artists: item.artists || [],
      album: item.album,
      image: item.image_url,
      url: item.spotify_url,
      previewUrl: item.preview_url,
      comment: item.comment,
      _dbId: item.id,
      _revision: item.revision,
      _occurrenceKey: item.occurrence_key
    }));

  return {
    id: row.spotify_playlist_id,
    name: row.editorial_name || row.imported_name,
    description: row.editorial_description ?? row.imported_description,
    spotifyUrl: row.spotify_url,
    coverImage: row.cover_image_url,
    order: row.display_order,
    tracks,
    _dbId: row.id,
    _revision: row.revision,
    _spotifySnapshotId: row.spotify_snapshot_id,
    _lastSyncedAt: row.last_synced_at
  };
}

export async function loadStudioPlaylists() {
  const client = requireClient();
  const { data, error } = await client
    .from('playlists')
    .select(`
      *,
      playlist_items (*)
    `)
    .eq('archived', false)
    .order('display_order', { ascending: true });

  if (error) throw error;

  return Object.fromEntries(
    (data || []).map(row => [row.slug, playlistFromRow(row)])
  );
}

export async function saveTrackComment(track, comment) {
  const client = requireClient();
  if (!track._dbId || !track._revision) throw new Error('TRACK_NOT_PERSISTED');

  const { data, error } = await client.rpc('save_playlist_item_comment', {
    item_id: track._dbId,
    expected_revision: track._revision,
    new_comment: comment
  });

  if (error) {
    const conflict = error.code === '40001' || error.message?.includes('EDIT_CONFLICT');
    const wrapped = new Error(conflict ? 'EDIT_CONFLICT' : 'COMMENT_SAVE_FAILED');
    wrapped.cause = error;
    throw wrapped;
  }

  return Array.isArray(data) ? data[0] : data;
}

export async function savePlaylistDescription(playlist, description) {
  const client = requireClient();
  if (!playlist._dbId || !playlist._revision) throw new Error('PLAYLIST_NOT_PERSISTED');

  const { data, error } = await client.rpc('save_playlist_description', {
    target_playlist_id: playlist._dbId,
    expected_revision: playlist._revision,
    new_description: description
  });

  if (error) {
    const conflict = error.code === '40001' || error.message?.includes('EDIT_CONFLICT');
    const wrapped = new Error(conflict ? 'EDIT_CONFLICT' : 'DESCRIPTION_SAVE_FAILED');
    wrapped.cause = error;
    throw wrapped;
  }

  return Array.isArray(data) ? data[0] : data;
}

export async function savePlaylistOrder(sortedPlaylists) {
  const client = requireClient();
  const updates = sortedPlaylists.map((playlist, index) =>
    client
      .from('playlists')
      .update({ display_order: index + 1, revision: playlist._revision + 1 })
      .eq('id', playlist._dbId)
      .eq('revision', playlist._revision)
      .select('id, revision')
      .single()
  );

  const results = await Promise.all(updates);
  const failure = results.find(result => result.error);
  if (failure) throw failure.error;
  return results.map(result => result.data);
}

export async function archivePlaylist(playlist) {
  const client = requireClient();
  const { data, error } = await client
    .from('playlists')
    .update({ archived: true, revision: playlist._revision + 1 })
    .eq('id', playlist._dbId)
    .eq('revision', playlist._revision)
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

function withOccurrenceKeys(tracks) {
  const occurrences = new Map();
  return tracks.map((track, index) => {
    const identity = track.id || `${track.title || ''}:${track.artist || ''}`;
    const occurrence = (occurrences.get(identity) || 0) + 1;
    occurrences.set(identity, occurrence);
    return {
      ...track,
      occurrenceKey: `${identity}:${occurrence}`,
      position: index
    };
  });
}

export async function syncSpotifyPlaylist(playlist, slug) {
  const client = requireClient();
  const payload = {
    ...playlist,
    slug,
    snapshotId: playlist.snapshotId || null,
    coverImage: playlist.coverImage || playlist.image || playlist.tracks?.[0]?.image || '',
    tracks: withOccurrenceKeys(playlist.tracks || [])
  };

  const { data, error } = await client.rpc('sync_spotify_playlist', {
    playlist_payload: payload
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function createPublicRelease() {
  const client = requireClient();
  const { data, error } = await client.rpc('create_public_release');
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function recordActivity(event) {
  const client = requireClient();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) return;

  await client.from('activity_events').insert({
    owner_id: user.id,
    operation: event.operation,
    entity_type: event.entityType || null,
    entity_id: event.entityId || null,
    outcome: event.outcome,
    correlation_id: event.correlationId,
    error_code: event.errorCode || null,
    duration_ms: event.durationMs ?? null,
    metadata: event.metadata || {}
  });
}

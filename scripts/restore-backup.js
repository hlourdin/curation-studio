import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const file = process.argv[2];
const apply = process.argv.includes('--apply');
if (!file) throw new Error('Usage: npm run backup:restore -- backup.json [--apply]');

const backup = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
if (backup.schemaVersion !== 1 || !Array.isArray(backup.playlists)) {
  throw new Error('UNSUPPORTED_BACKUP_SCHEMA');
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CURATOR_USER_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CURATOR_USER_ID) {
  throw new Error('RESTORE_CONFIGURATION_MISSING');
}
if (backup.ownerId !== CURATOR_USER_ID) throw new Error('BACKUP_OWNER_MISMATCH');

const summary = {
  mode: apply ? 'apply' : 'dry-run',
  playlists: backup.playlists.length,
  tracks: backup.playlists.reduce(
    (sum, playlist) => sum + (playlist.playlist_items?.length || 0),
    0
  )
};
console.log(JSON.stringify(summary, null, 2));
if (!apply) process.exit(0);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

for (const playlist of backup.playlists) {
  const tracks = [...(playlist.playlist_items || [])]
    .filter(item => !item.removed_from_source)
    .sort((a, b) => a.position - b.position)
    .map(item => ({
      id: item.spotify_track_id,
      occurrenceKey: item.occurrence_key,
      title: item.title,
      artist: item.artist,
      artists: item.artists,
      album: item.album,
      image: item.image_url,
      url: item.spotify_url,
      previewUrl: item.preview_url,
      comment: item.comment
    }));

  const payload = {
    id: playlist.spotify_playlist_id,
    slug: playlist.slug,
    name: playlist.imported_name,
    description: playlist.imported_description,
    spotifyUrl: playlist.spotify_url,
    coverImage: playlist.cover_image_url,
    snapshotId: playlist.spotify_snapshot_id,
    order: playlist.display_order,
    tracks
  };
  const { data: restored, error } = await supabase.rpc(
    'sync_spotify_playlist_as_owner',
    { target_owner: CURATOR_USER_ID, playlist_payload: payload }
  );
  if (error) throw error;
  const row = Array.isArray(restored) ? restored[0] : restored;

  await supabase.from('playlists').update({
    editorial_name: playlist.editorial_name,
    editorial_description: playlist.editorial_description,
    featured: playlist.featured,
    publish_state: playlist.publish_state,
    archived: playlist.archived
  }).eq('id', row.id);

  for (const item of playlist.playlist_items || []) {
    await supabase.from('playlist_items').update({
      comment: item.comment,
      removed_from_source: item.removed_from_source
    }).eq('playlist_id', row.id).eq('occurrence_key', item.occurrence_key);
  }
}

console.log('Restauration terminée.');

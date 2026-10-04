import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const rootDir = path.resolve(new URL('..', import.meta.url).pathname);
const diskPath = path.join(rootDir, 'src/data/playlists-data.json');
const browserArg = process.argv.indexOf('--browser');
const browserPath = browserArg >= 0 ? process.argv[browserArg + 1] : null;
const apply = process.argv.includes('--apply');

const disk = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
const browser = browserPath
  ? JSON.parse(fs.readFileSync(path.resolve(browserPath), 'utf8'))
  : null;

function identity(track) {
  return track.id || `${track.title || ''}:${track.artist || ''}`;
}

function indexedTracks(playlist) {
  const seen = new Map();
  return (playlist.tracks || []).map(track => {
    const id = identity(track);
    const occurrence = (seen.get(id) || 0) + 1;
    seen.set(id, occurrence);
    return { ...track, occurrenceKey: `${id}:${occurrence}` };
  });
}

const conflicts = [];
const merged = structuredClone(disk);

if (browser) {
  for (const [slug, browserPlaylist] of Object.entries(browser)) {
    const diskPlaylist = disk[slug];
    if (!diskPlaylist) {
      merged[slug] = browserPlaylist;
      continue;
    }

    const diskByKey = new Map(indexedTracks(diskPlaylist).map(track => [track.occurrenceKey, track]));
    const mergedTracks = indexedTracks(browserPlaylist).map(browserTrack => {
      const diskTrack = diskByKey.get(browserTrack.occurrenceKey);
      const browserComment = (browserTrack.comment || '').trim();
      const diskComment = (diskTrack?.comment || '').trim();
      if (browserComment && diskComment && browserComment !== diskComment) {
        conflicts.push({
          slug,
          occurrenceKey: browserTrack.occurrenceKey,
          diskComment,
          browserComment
        });
      }
      return {
        ...(diskTrack || browserTrack),
        ...browserTrack,
        comment: browserComment || diskComment
      };
    });

    merged[slug] = {
      ...diskPlaylist,
      ...browserPlaylist,
      tracks: mergedTracks
    };
  }
}

const report = {
  mode: apply ? 'apply' : 'dry-run',
  diskPlaylists: Object.keys(disk).length,
  browserPlaylists: browser ? Object.keys(browser).length : null,
  mergedPlaylists: Object.keys(merged).length,
  mergedTracks: Object.values(merged).reduce((sum, playlist) => sum + (playlist.tracks?.length || 0), 0),
  comments: Object.values(merged).reduce(
    (sum, playlist) => sum + (playlist.tracks || []).filter(track => (track.comment || '').trim()).length,
    0
  ),
  conflicts
};

console.log(JSON.stringify(report, null, 2));

if (!apply) {
  console.log('Simulation terminée. Relancez avec --apply après validation du rapport.');
  process.exit(0);
}
if (conflicts.length) {
  throw new Error('MIGRATION_CONFLICTS_REQUIRE_MANUAL_RESOLUTION');
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CURATOR_USER_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CURATOR_USER_ID) {
  throw new Error('MIGRATION_CONFIGURATION_MISSING');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

for (const [slug, playlist] of Object.entries(merged)) {
  const payload = {
    ...playlist,
    slug,
    snapshotId: playlist.snapshotId || null,
    coverImage: playlist.coverImage || playlist.image || playlist.tracks?.[0]?.image || '',
    tracks: indexedTracks(playlist)
  };
  const { data: savedPlaylist, error } = await supabase.rpc(
    'sync_spotify_playlist_as_owner',
    { target_owner: CURATOR_USER_ID, playlist_payload: payload }
  );
  if (error) throw error;

  const playlistRow = Array.isArray(savedPlaylist) ? savedPlaylist[0] : savedPlaylist;
  for (const track of payload.tracks.filter(item => (item.comment || '').trim())) {
    const { error: commentError } = await supabase
      .from('playlist_items')
      .update({ comment: track.comment })
      .eq('playlist_id', playlistRow.id)
      .eq('occurrence_key', track.occurrenceKey);
    if (commentError) throw commentError;
  }
}

console.log('Migration appliquée avec succès.');

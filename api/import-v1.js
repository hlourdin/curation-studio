import catalogue from '../src/data/playlists-data.json' with { type: 'json' };
import { requireCurator, sendError } from './_lib/supabase.js';

function tracksWithOccurrenceKeys(tracks = []) {
  const seen = new Map();
  return tracks.map(track => {
    const identity = track.id || `${track.title || ''}:${track.artist || ''}`;
    const occurrence = (seen.get(identity) || 0) + 1;
    seen.set(identity, occurrence);
    return {
      ...track,
      occurrenceKey: `${identity}:${occurrence}`
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { supabase, user } = await requireCurator(req);
    let playlistCount = 0;
    let trackCount = 0;
    let commentCount = 0;

    for (const [slug, playlist] of Object.entries(catalogue)) {
      const tracks = tracksWithOccurrenceKeys(playlist.tracks);
      const payload = {
        ...playlist,
        slug,
        snapshotId: playlist.snapshotId || null,
        coverImage: playlist.coverImage || playlist.image || tracks[0]?.image || '',
        tracks
      };
      const { data: saved, error } = await supabase.rpc(
        'sync_spotify_playlist_as_owner',
        {
          target_owner: user.id,
          playlist_payload: payload
        }
      );
      if (error) throw error;
      const row = Array.isArray(saved) ? saved[0] : saved;

      for (const track of tracks.filter(item => (item.comment || '').trim())) {
        const { error: commentError } = await supabase
          .from('playlist_items')
          .update({ comment: track.comment })
          .eq('playlist_id', row.id)
          .eq('occurrence_key', track.occurrenceKey);
        if (commentError) throw commentError;
        commentCount += 1;
      }

      playlistCount += 1;
      trackCount += tracks.length;
    }

    return res.status(200).json({ playlistCount, trackCount, commentCount });
  } catch (error) {
    return sendError(res, error);
  }
}

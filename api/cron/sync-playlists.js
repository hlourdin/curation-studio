import crypto from 'node:crypto';
import { decryptToken, encryptToken } from '../_lib/token-crypto.js';
import { fetchCompleteSpotifyPlaylist, refreshSpotifyAccessToken } from '../_lib/spotify.js';
import { getServiceClient, sendError } from '../_lib/supabase.js';

function authorized(req) {
  const expected = process.env.CRON_SECRET;
  const received = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  if (!authorized(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const supabase = getServiceClient();
    const { data: playlists, error } = await supabase
      .from('playlists')
      .select('id, owner_id, spotify_playlist_id, slug, display_order, last_sync_status, updated_at')
      .eq('auto_sync', true)
      .eq('archived', false)
      .not('spotify_playlist_id', 'is', null);
    if (error) throw error;

    const connections = new Map();
    const results = [];

    for (const playlist of playlists || []) {
      const runningRecently =
        playlist.last_sync_status === 'running' &&
        Date.now() - new Date(playlist.updated_at).getTime() < 30 * 60 * 1000;
      if (runningRecently) {
        results.push({ playlistId: playlist.id, outcome: 'skipped_locked' });
        continue;
      }

      await supabase
        .from('playlists')
        .update({ last_sync_status: 'running', last_sync_error_code: null })
        .eq('id', playlist.id);

      try {
        let connection = connections.get(playlist.owner_id);
        if (!connection) {
          const { data, error: connectionError } = await supabase
            .from('spotify_connections')
            .select('*')
            .eq('owner_id', playlist.owner_id)
            .single();
          if (connectionError) throw new Error('SPOTIFY_CONNECTION_MISSING');

          const refreshToken = decryptToken(
            data.refresh_token_ciphertext,
            data.refresh_token_iv
          );
          const refreshed = await refreshSpotifyAccessToken(refreshToken);

          connection = {
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token || refreshToken
          };
          connections.set(playlist.owner_id, connection);

          if (refreshed.refresh_token) {
            const encrypted = encryptToken(refreshed.refresh_token);
            await supabase.from('spotify_connections').update({
              refresh_token_ciphertext: encrypted.ciphertext,
              refresh_token_iv: encrypted.iv,
              last_refreshed_at: new Date().toISOString(),
              reconnect_required: false
            }).eq('owner_id', playlist.owner_id);
          }
        }

        const payload = await fetchCompleteSpotifyPlaylist(
          playlist.spotify_playlist_id,
          connection.accessToken
        );
        payload.slug = playlist.slug;
        payload.order = playlist.display_order;

        const { error: syncError } = await supabase.rpc(
          'sync_spotify_playlist_as_owner',
          {
            target_owner: playlist.owner_id,
            playlist_payload: payload
          }
        );
        if (syncError) throw syncError;

        results.push({
          playlistId: playlist.id,
          outcome: 'succeeded',
          trackCount: payload.tracks.length
        });
      } catch (syncError) {
        const code = String(syncError.message || 'SPOTIFY_SYNC_FAILED').slice(0, 120);
        await supabase.from('playlists').update({
          last_sync_status: code.includes('RECONNECT') ? 'needs_reconnect' : 'failed',
          last_sync_error_code: code
        }).eq('id', playlist.id);
        results.push({ playlistId: playlist.id, outcome: 'failed', errorCode: code });
      }
    }

    return res.status(200).json({
      processed: results.length,
      succeeded: results.filter(result => result.outcome === 'succeeded').length,
      results
    });
  } catch (error) {
    return sendError(res, error);
  }
}

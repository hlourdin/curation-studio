import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchCompleteSpotifyPlaylist } from '../api/_lib/spotify.js';

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

const track = {
  id: 'track-1',
  name: 'Titre',
  artists: [{ name: 'Artiste', external_urls: { spotify: 'https://artist' } }],
  album: { name: 'Album', images: [{ url: 'https://cover' }] },
  external_urls: { spotify: 'https://track' },
  preview_url: null
};

test('loads every Spotify page and creates stable occurrence keys', async t => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let call = 0;
  global.fetch = async () => {
    call += 1;
    if (call === 1) {
      return response({
        name: 'Playlist',
        description: '',
        snapshot_id: 'snapshot',
        images: [],
        external_urls: { spotify: 'https://playlist' },
        tracks: { items: [{ track }], next: 'https://next' }
      });
    }
    return response({ items: [{ track }], next: null });
  };

  const playlist = await fetchCompleteSpotifyPlaylist('playlist-id', 'token');
  assert.equal(playlist.tracks.length, 2);
  assert.equal(playlist.tracks[0].occurrenceKey, 'track-1:1');
  assert.equal(playlist.tracks[1].occurrenceKey, 'track-1:2');
  assert.equal(playlist.snapshotId, 'snapshot');
});

test('rejects partial Spotify pagination', async t => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let call = 0;
  global.fetch = async () => {
    call += 1;
    return call === 1
      ? response({
          name: 'Playlist',
          tracks: { items: [{ track }], next: 'https://next' }
        })
      : response({ error: 'rate limited' }, 429);
  };

  await assert.rejects(
    fetchCompleteSpotifyPlaylist('playlist-id', 'token'),
    /IMPORT_INCOMPLETE_429/
  );
});

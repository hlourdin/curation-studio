import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildStaticSite } from '../scripts/export-site.js';

function fixture() {
  return {
    schemaVersion: 1,
    playlists: [{
      slug: 'test-playlist',
      name: 'Test & écoute',
      description: 'Une sélection',
      spotifyUrl: 'https://open.spotify.com/playlist/test',
      coverImage: 'https://example.test/cover.jpg',
      order: 1,
      tracks: [{
        id: 'track-1',
        title: 'Titre <rare>',
        artist: 'Artiste',
        artists: [{ name: 'Artiste', url: 'https://example.test/artist' }],
        album: 'Album',
        year: '2005',
        label: 'Ninja Tune',
        image: 'https://example.test/track.jpg',
        url: 'https://open.spotify.com/track/track-1',
        previewUrl: '',
        comment: 'Note de curation'
      }]
    }]
  };
}

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'curation-static-'));
  const outDir = path.join(root, 'out');
  const assetDir = path.join(root, 'assets');
  fs.mkdirSync(assetDir);
  fs.writeFileSync(path.join(assetDir, 'style.css'), 'body{}');
  fs.writeFileSync(path.join(assetDir, 'player.js'), '');
  return { root, outDir, assetDir };
}

test('generates deterministic public files from an immutable release', () => {
  const { root, outDir, assetDir } = setup();
  try {
    const first = buildStaticSite({ playlistsData: fixture(), outDir, assetDir });
    assert.deepEqual(first.slugs, ['test-playlist']);
    const homepage = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
    const page = fs.readFileSync(path.join(outDir, 'playlists/test-playlist.html'), 'utf8');
    const data = fs.readFileSync(path.join(outDir, 'data/test-playlist.json'), 'utf8');

    assert.match(homepage, /Test &amp; écoute/);
    assert.match(page, /Titre &lt;rare&gt;/);
    assert.match(page, /class="track-year">2005</);
    assert.match(page, /class="track-label">Ninja Tune</);
    assert.match(page, /class="track-album-row"/);
    assert.equal(JSON.parse(data).tracks.length, 1);
    assert.ok(fs.existsSync(path.join(outDir, 'assets/style.css')));

    buildStaticSite({ playlistsData: fixture(), outDir, assetDir });
    assert.equal(fs.readFileSync(path.join(outDir, 'index.html'), 'utf8'), homepage);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('rejects private fields in a release payload', () => {
  const { root, outDir, assetDir } = setup();
  try {
    const payload = fixture();
    payload.refresh_token = 'must-not-leak';
    assert.throws(
      () => buildStaticSite({ playlistsData: payload, outDir, assetDir }),
      /PRIVATE_FIELD_IN_RELEASE/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('removes orphan pages and data files', () => {
  const { root, outDir, assetDir } = setup();
  try {
    buildStaticSite({ playlistsData: fixture(), outDir, assetDir });
    const empty = { schemaVersion: 1, playlists: [] };
    buildStaticSite({ playlistsData: empty, outDir, assetDir });
    assert.equal(fs.existsSync(path.join(outDir, 'playlists/test-playlist.html')), false);
    assert.equal(fs.existsSync(path.join(outDir, 'data/test-playlist.json')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { createEditorialBackup } from '../api/backup.js';

test('creates a versioned owner-scoped editorial backup', () => {
  const playlists = [{
    id: 'playlist-id',
    owner_id: 'owner-id',
    archived: true,
    playlist_items: [{
      id: 'item-id',
      comment: 'Note conservée',
      removed_from_source: true
    }]
  }];

  const backup = createEditorialBackup({
    ownerId: 'owner-id',
    playlists,
    exportedAt: '2026-10-09T12:00:00.000Z'
  });

  assert.deepEqual(backup, {
    schemaVersion: 1,
    exportedAt: '2026-10-09T12:00:00.000Z',
    ownerId: 'owner-id',
    scope: 'editorial-data',
    playlists
  });
});

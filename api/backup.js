import { requireCurator, sendError } from './_lib/supabase.js';

export function createEditorialBackup({ ownerId, playlists, exportedAt = new Date().toISOString() }) {
  return {
    schemaVersion: 1,
    exportedAt,
    ownerId,
    scope: 'editorial-data',
    playlists: playlists || []
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { supabase, user } = await requireCurator(req);
    const { data: playlists, error: playlistsError } = await supabase
      .from('playlists')
      .select('*, playlist_items(*)')
      .eq('owner_id', user.id)
      .order('display_order');
    if (playlistsError) throw playlistsError;

    const exportedAt = new Date().toISOString();
    const backup = createEditorialBackup({
      ownerId: user.id,
      playlists,
      exportedAt
    });
    const filename = `curation-studio-backup-${exportedAt.replace(/[:.]/g, '-')}.json`;

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).json(backup);
  } catch (error) {
    return sendError(res, error);
  }
}

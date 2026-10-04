import { encryptToken } from '../_lib/token-crypto.js';
import { requireCurator, sendError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { supabase, user } = await requireCurator(req);
    const { refreshToken, scopes = [], expiresAt = null } = req.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'REFRESH_TOKEN_REQUIRED' });
    }

    const encrypted = encryptToken(refreshToken);
    const { error } = await supabase.from('spotify_connections').upsert({
      owner_id: user.id,
      refresh_token_ciphertext: encrypted.ciphertext,
      refresh_token_iv: encrypted.iv,
      scopes,
      expires_at: expiresAt,
      reconnect_required: false
    });
    if (error) throw error;

    return res.status(204).end();
  } catch (error) {
    return sendError(res, error);
  }
}

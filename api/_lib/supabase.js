import { createClient } from '@supabase/supabase-js';

export function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVER_CONFIGURATION_MISSING');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function requireCurator(req) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!token) {
    const error = new Error('AUTH_REQUIRED');
    error.statusCode = 401;
    throw error;
  }

  const supabase = getServiceClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);
  if (userError || !user) {
    const error = new Error('INVALID_SESSION');
    error.statusCode = 401;
    throw error;
  }

  const { data: curator, error: curatorError } = await supabase
    .from('curators')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (curatorError || !curator) {
    const error = new Error('CURATOR_REQUIRED');
    error.statusCode = 403;
    throw error;
  }

  return { supabase, user, token };
}

export function sendError(res, error) {
  const status = error.statusCode || 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    error: status >= 500 ? 'INTERNAL_ERROR' : error.message
  });
}

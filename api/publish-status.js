import { requireCurator, sendError } from './_lib/supabase.js';
import { getDeployment } from './_lib/vercel.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { supabase, user } = await requireCurator(req);
    const releaseId = req.query.releaseId;
    if (!releaseId) return res.status(400).json({ error: 'RELEASE_ID_REQUIRED' });

    const { data: release, error } = await supabase
      .from('releases')
      .select('id, status, deployment_id, error_code, published_at')
      .eq('id', releaseId)
      .eq('owner_id', user.id)
      .single();
    if (error || !release) return res.status(404).json({ error: 'RELEASE_NOT_FOUND' });

    if (!release.deployment_id || ['live', 'failed'].includes(release.status)) {
      return res.status(200).json(release);
    }

    const deployment = await getDeployment(release.deployment_id);
    const readyState = deployment.readyState || deployment.status;
    let status = release.status;
    let errorCode = null;
    let publishedAt = null;

    if (readyState === 'READY') {
      status = 'live';
      publishedAt = new Date().toISOString();
      await supabase
        .from('releases')
        .update({ status: 'superseded' })
        .eq('owner_id', user.id)
        .eq('status', 'live')
        .neq('id', release.id);
    } else if (['ERROR', 'CANCELED'].includes(readyState)) {
      status = 'failed';
      errorCode = `VERCEL_${readyState}`;
    }

    if (status !== release.status) {
      await supabase.from('releases').update({
        status,
        error_code: errorCode,
        published_at: publishedAt
      }).eq('id', release.id);
    }

    return res.status(200).json({
      ...release,
      status,
      error_code: errorCode,
      published_at: publishedAt,
      deployment_url: deployment.url || null
    });
  } catch (error) {
    return sendError(res, error);
  }
}

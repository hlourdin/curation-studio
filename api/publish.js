import { requireCurator, sendError } from './_lib/supabase.js';
import { createReleaseDeployment } from './_lib/vercel.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { supabase, user } = await requireCurator(req);
    const { releaseId } = req.body || {};
    if (!releaseId) return res.status(400).json({ error: 'RELEASE_ID_REQUIRED' });

    const { data: release, error } = await supabase
      .from('releases')
      .select('id, owner_id, status, deployment_id')
      .eq('id', releaseId)
      .eq('owner_id', user.id)
      .single();
    if (error || !release) return res.status(404).json({ error: 'RELEASE_NOT_FOUND' });

    if (release.status === 'building' && release.deployment_id) {
      return res.status(200).json({
        releaseId,
        deploymentId: release.deployment_id,
        status: 'building',
        reused: true
      });
    }
    if (release.status === 'live' && release.deployment_id) {
      return res.status(200).json({
        releaseId,
        deploymentId: release.deployment_id,
        status: 'live',
        reused: true
      });
    }

    const { data: active } = await supabase
      .from('releases')
      .select('id')
      .eq('owner_id', user.id)
      .eq('status', 'building')
      .neq('id', releaseId)
      .limit(1);
    if (active?.length) {
      return res.status(409).json({ error: 'PUBLICATION_ALREADY_RUNNING' });
    }

    const deployment = await createReleaseDeployment(releaseId);
    const { error: updateError } = await supabase
      .from('releases')
      .update({
        status: 'building',
        deployment_id: deployment.id,
        error_code: null
      })
      .eq('id', releaseId)
      .eq('owner_id', user.id);
    if (updateError) throw updateError;

    return res.status(202).json({
      releaseId,
      deploymentId: deployment.id,
      status: 'building'
    });
  } catch (error) {
    return sendError(res, error);
  }
}

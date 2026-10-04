const API_ROOT = 'https://api.vercel.com';

function configuration() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) throw new Error('VERCEL_PUBLISH_CONFIGURATION_MISSING');
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID || '' };
}

async function vercelRequest(path, options = {}) {
  const { token, teamId } = configuration();
  const url = new URL(`${API_ROOT}${path}`);
  if (teamId) url.searchParams.set('teamId', teamId);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(body?.error?.code || `VERCEL_${response.status}`);
    error.details = body;
    throw error;
  }
  return body;
}

export async function bindReleaseToProduction(releaseId) {
  const { projectId } = configuration();
  const listing = await vercelRequest(`/v10/projects/${projectId}/env`);
  const existing = (listing.envs || []).find(variable =>
    variable.key === 'RELEASE_ID' &&
    (!variable.target || variable.target.includes('production'))
  );
  const payload = JSON.stringify({
    key: 'RELEASE_ID',
    value: releaseId,
    type: 'encrypted',
    target: ['production']
  });

  if (existing) {
    await vercelRequest(`/v9/projects/${projectId}/env/${existing.id}`, {
      method: 'PATCH',
      body: payload
    });
  } else {
    await vercelRequest(`/v10/projects/${projectId}/env`, {
      method: 'POST',
      body: payload
    });
  }
}

export async function createReleaseDeployment(releaseId) {
  const { projectId } = configuration();
  const repo = process.env.VERCEL_GIT_REPO_ID || 'hlourdin/curation-studio';
  const [org, repository] = repo.split('/');
  const ref = process.env.VERCEL_GIT_REF || 'codex/v2-online-studio';

  await bindReleaseToProduction(releaseId);
  return vercelRequest('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name: process.env.VERCEL_DEPLOYMENT_NAME || 'curation-studio-public-v2',
      project: projectId,
      target: 'production',
      gitSource: {
        type: 'github',
        org,
        repo: repository,
        ref
      },
      meta: {
        releaseId
      }
    })
  });
}

export function getDeployment(deploymentId) {
  return vercelRequest(`/v13/deployments/${deploymentId}`);
}

const API_ROOT = 'https://api.vercel.com';

function configuration() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId =
    process.env.PUBLIC_VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
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
  const project = await vercelRequest(`/v9/projects/${projectId}`);
  const repoId = project.link?.repoId;
  if (!repoId || !['github', 'github-limited'].includes(project.link?.type)) {
    throw new Error('VERCEL_GITHUB_LINK_MISSING');
  }
  const ref = process.env.VERCEL_GIT_REF ||
    project.link.productionBranch ||
    'codex/v2-online-studio';

  await bindReleaseToProduction(releaseId);
  return vercelRequest('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name: process.env.VERCEL_DEPLOYMENT_NAME || project.name,
      project: projectId,
      target: 'production',
      gitSource: {
        type: 'github',
        repoId,
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

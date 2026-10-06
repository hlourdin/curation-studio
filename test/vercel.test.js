import assert from 'node:assert/strict';
import test from 'node:test';

import { createReleaseDeployment } from '../api/_lib/vercel.js';

test('creates a deployment with the linked GitHub repoId', async () => {
  const previousFetch = global.fetch;
  const envKeys = [
    'VERCEL_API_TOKEN',
    'VERCEL_PROJECT_ID',
    'VERCEL_TEAM_ID',
    'VERCEL_DEPLOYMENT_NAME',
    'VERCEL_GIT_REF'
  ];
  const previousEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const requests = [];

  process.env.VERCEL_API_TOKEN = 'test-token';
  process.env.VERCEL_PROJECT_ID = 'prj_public';
  delete process.env.VERCEL_TEAM_ID;
  delete process.env.VERCEL_DEPLOYMENT_NAME;
  delete process.env.VERCEL_GIT_REF;

  global.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    const index = requests.length;
    const bodies = {
      1: {
        name: 'curation-studio-v2-public',
        link: {
          type: 'github',
          repoId: 1327864241,
          productionBranch: 'codex/v2-online-studio'
        }
      },
      2: { envs: [] },
      3: { created: { id: 'env_release' } },
      4: { id: 'dpl_release', status: 'BUILDING' }
    };

    return {
      ok: true,
      status: 200,
      json: async () => bodies[index]
    };
  };

  try {
    const deployment = await createReleaseDeployment('release-id');
    assert.equal(deployment.id, 'dpl_release');

    const requestBody = JSON.parse(requests[3].options.body);
    assert.equal(requestBody.name, 'curation-studio-v2-public');
    assert.deepEqual(requestBody.gitSource, {
      type: 'github',
      repoId: 1327864241,
      ref: 'codex/v2-online-studio'
    });
  } finally {
    global.fetch = previousFetch;
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  }
});

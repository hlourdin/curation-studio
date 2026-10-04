import { spawnSync } from 'node:child_process';

if (process.env.RELEASE_ID) {
  await import('./build-from-release.js');
} else {
  const result = spawnSync('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

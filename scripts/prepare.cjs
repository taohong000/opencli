const { existsSync } = require('fs');
const { spawnSync } = require('child_process');

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

if (!existsSync('src')) {
  console.log('[prepare] Skipping build because src/ is missing');
  process.exit(0);
}

const result = spawnSync(getNpmCommand(), ['run', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.warn('[prepare] Build failed to start:', result.error.message);
  process.exit(0);
}

if (typeof result.status === 'number' && result.status !== 0) {
  console.warn(`[prepare] Build failed with exit code ${result.status}, continuing`);
}

process.exit(0);

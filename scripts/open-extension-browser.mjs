import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import {
  buildBrowserLaunchArgs,
  resolveBrowserExecutable,
  resolveExtensionBrowserConfig,
} from './open-extension-browser-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const config = resolveExtensionBrowserConfig(process.env, repoRoot);
const executable = resolveBrowserExecutable(process.env);

if (!fs.existsSync(config.extensionDir)) {
  console.error(`Extension directory not found: ${config.extensionDir}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(config.extensionDir, 'manifest.json'))) {
  console.error(`Extension manifest not found under: ${config.extensionDir}`);
  process.exit(1);
}

if (!executable) {
  console.error('Could not find a Chrome/Chromium/Edge executable. Set OPENCLI_BROWSER_EXECUTABLE first.');
  process.exit(1);
}

const args = buildBrowserLaunchArgs(config);
const shouldPrintConfig = process.argv.includes('--print-config');

if (shouldPrintConfig) {
  console.log(
    JSON.stringify(
      {
        executable,
        ...config,
        args,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

fs.mkdirSync(config.profileDir, { recursive: true });

const child = spawn(executable, args, {
  cwd: repoRoot,
  detached: true,
  stdio: 'ignore',
});

child.unref();

console.log(`Opened browser with OpenCLI extension.`);
console.log(`Browser: ${executable}`);
console.log(`Profile: ${config.profileDir}`);
console.log(`Target: ${config.targetUrl}`);

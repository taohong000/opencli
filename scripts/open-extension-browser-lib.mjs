import fs from 'node:fs';
import path from 'node:path';

function normalizeEnvValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function findPlaywrightChromiumExecutable(localAppData, existsSync = fs.existsSync) {
  if (!localAppData) {
    return null;
  }

  const playwrightRoot = path.join(localAppData, 'ms-playwright');
  if (!existsSync(playwrightRoot)) {
    return null;
  }

  let entries = [];
  try {
    entries = fs.readdirSync(playwrightRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  const chromiumDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium-'))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const dirName of chromiumDirs) {
    const candidate = path.join(playwrightRoot, dirName, 'chrome-win', 'chrome.exe');
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function readSavedProfilePointer(repoRoot) {
  const pointerFile = path.join(repoRoot, '.opencli-extension-profile-path');
  try {
    const value = fs.readFileSync(pointerFile, 'utf8').trim();
    return value || null;
  } catch {
    return null;
  }
}

export function resolveExtensionBrowserConfig(
  env = process.env,
  repoRoot = process.cwd(),
  existsSync = fs.existsSync,
) {
  const extensionDir =
    normalizeEnvValue(env.OPENCLI_EXTENSION_DIR) ?? path.join(repoRoot, 'extension');

  const explicitProfileDir = normalizeEnvValue(env.OPENCLI_EXTENSION_PROFILE_DIR);
  const savedProfileDir = readSavedProfilePointer(repoRoot);
  const preferredProfiles = [
    path.join(repoRoot, '.playwright-extension-profile-opencli'),
    path.join(repoRoot, '.chrome-extension-profile-opencli-fresh'),
    path.join(repoRoot, '.chrome-extension-profile-opencli'),
  ];
  const profileDir =
    explicitProfileDir ??
    savedProfileDir ??
    preferredProfiles.find((candidate) => existsSync(candidate)) ??
    preferredProfiles[0];

  const targetUrl = normalizeEnvValue(env.OPENCLI_EXTENSION_TARGET_URL) ?? 'https://www.douyin.com/';

  return {
    extensionDir,
    profileDir,
    targetUrl,
  };
}

export function resolveBrowserExecutable(env = process.env, existsSync = fs.existsSync) {
  const explicitExecutable = normalizeEnvValue(env.OPENCLI_BROWSER_EXECUTABLE);
  if (explicitExecutable) {
    return explicitExecutable;
  }

  const candidates = [];
  if (process.platform === 'win32') {
    const localAppData = env.LOCALAPPDATA ?? process.env.LOCALAPPDATA ?? '';
    const playwrightChromium = findPlaywrightChromiumExecutable(localAppData, existsSync);
    if (playwrightChromium) {
      return playwrightChromium;
    }
    const programFiles = env.ProgramFiles ?? process.env.ProgramFiles ?? 'C:\\Program Files';
    const programFilesX86 = env['ProgramFiles(x86)'] ?? process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
    candidates.push(
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Chromium', 'Application', 'chrome.exe'),
      path.join(programFiles, 'Chromium', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Chromium', 'Application', 'chrome.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    );
  } else {
    candidates.push('google-chrome', 'chromium-browser', 'chromium', 'microsoft-edge');
  }

  return candidates.find((candidate) => {
    if (!candidate) {
      return false;
    }
    if (candidate.includes(path.sep) || candidate.includes('/')) {
      return existsSync(candidate);
    }
    return true;
  }) ?? null;
}

export function buildBrowserLaunchArgs({ extensionDir, profileDir, targetUrl }) {
  return [
    '--new-window',
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    `--user-data-dir=${profileDir}`,
    targetUrl,
  ];
}

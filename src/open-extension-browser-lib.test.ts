import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface ExtensionBrowserConfig {
  extensionDir: string;
  profileDir: string;
  targetUrl: string;
}

const require = createRequire(import.meta.url);
const launcherLib = require('../scripts/open-extension-browser-lib.mjs') as {
  buildBrowserLaunchArgs: (config: ExtensionBrowserConfig) => string[];
  resolveBrowserExecutable: (
    env?: NodeJS.ProcessEnv,
    existsSync?: (candidate: string) => boolean,
  ) => string | null;
  resolveExtensionBrowserConfig: (
    env?: NodeJS.ProcessEnv,
    repoRoot?: string,
    existsSync?: (candidate: string) => boolean,
  ) => ExtensionBrowserConfig;
};

const {
  buildBrowserLaunchArgs,
  resolveBrowserExecutable,
  resolveExtensionBrowserConfig,
} = launcherLib;

describe('open-extension-browser-lib', () => {
  it('prefers an explicit profile directory from env', () => {
    const repoRoot = 'D:\\repo\\opencli';
    const config = resolveExtensionBrowserConfig(
      {
        OPENCLI_EXTENSION_PROFILE_DIR: 'D:\\profiles\\douyin',
      },
      repoRoot,
      () => false,
    );

    expect(config.profileDir).toBe('D:\\profiles\\douyin');
  });

  it('reuses a saved extension profile pointer before scanning fallback profiles', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-profile-pointer-'));
    const savedProfile = path.join(tempRoot, '.chrome-extension-profile-opencli-pw-fresh-verify');
    fs.writeFileSync(path.join(tempRoot, '.opencli-extension-profile-path'), `${savedProfile}\n`);

    try {
      const config = resolveExtensionBrowserConfig({}, tempRoot, () => false);
      expect(config.profileDir).toBe(savedProfile);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('reuses the Playwright extension profile first so login state persists', () => {
    const repoRoot = 'D:\\repo\\opencli';
    const persistentProfile = path.join(repoRoot, '.playwright-extension-profile-opencli');
    const config = resolveExtensionBrowserConfig({}, repoRoot, (candidate: string) => candidate === persistentProfile);

    expect(config.profileDir).toBe(persistentProfile);
  });

  it('falls back to the fresh extension profile when only it exists', () => {
    const repoRoot = 'D:\\repo\\opencli';
    const freshProfile = path.join(repoRoot, '.chrome-extension-profile-opencli-fresh');
    const config = resolveExtensionBrowserConfig({}, repoRoot, (candidate: string) => candidate === freshProfile);

    expect(config.profileDir).toBe(freshProfile);
  });

  it('falls back to the standard extension profile when no preferred profile exists', () => {
    const repoRoot = 'D:\\repo\\opencli';
    const config = resolveExtensionBrowserConfig({}, repoRoot, () => false);

    expect(config.profileDir).toBe(path.join(repoRoot, '.playwright-extension-profile-opencli'));
  });

  it('uses an explicit browser executable from env first', () => {
    const executable = resolveBrowserExecutable(
      {
        OPENCLI_BROWSER_EXECUTABLE: 'C:\\Browsers\\chrome.exe',
      },
      () => false,
    );

    expect(executable).toBe('C:\\Browsers\\chrome.exe');
  });

  it('prefers the Playwright Chromium runtime before system Chrome on Windows', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-playwright-'));
    const localAppData = path.join(tempRoot, 'AppData', 'Local');
    const playwrightChromium = path.join(localAppData, 'ms-playwright', 'chromium-1217', 'chrome-win', 'chrome.exe');
    fs.mkdirSync(path.dirname(playwrightChromium), { recursive: true });
    fs.writeFileSync(playwrightChromium, '');

    try {
      const executable = resolveBrowserExecutable(
        {
          LOCALAPPDATA: localAppData,
          ProgramFiles: 'C:\\Program Files',
          'ProgramFiles(x86)': 'C:\\Program Files (x86)',
        },
        fs.existsSync,
      );

      expect(executable).toBe(playwrightChromium);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('builds launch args with extension and profile flags', () => {
    const args = buildBrowserLaunchArgs({
      extensionDir: 'D:\\repo\\opencli\\extension',
      profileDir: 'D:\\repo\\opencli\\.chrome-extension-profile-opencli-fresh',
      targetUrl: 'https://www.douyin.com/',
    });

    expect(args).toContain('--new-window');
    expect(args).toContain('--disable-extensions-except=D:\\repo\\opencli\\extension');
    expect(args).toContain('--load-extension=D:\\repo\\opencli\\extension');
    expect(args).toContain('--user-data-dir=D:\\repo\\opencli\\.chrome-extension-profile-opencli-fresh');
    expect(args.at(-1)).toBe('https://www.douyin.com/');
  });
});

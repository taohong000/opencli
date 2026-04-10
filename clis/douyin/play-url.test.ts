import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchDouyinVideoDetailMock } = vi.hoisted(() => ({
  fetchDouyinVideoDetailMock: vi.fn(),
}));

vi.mock('./_shared/public-api.js', () => ({
  fetchDouyinVideoDetail: fetchDouyinVideoDetailMock,
}));

import { getRegistry } from '@jackwener/opencli/registry';
import { CliError } from '@jackwener/opencli/errors';
import './play-url.js';

describe('douyin play-url', () => {
  beforeEach(() => {
    fetchDouyinVideoDetailMock.mockReset();
  });

  it('registers the command', () => {
    const registry = getRegistry();
    const command = [...registry.values()].find((cmd) => cmd.site === 'douyin' && cmd.name === 'play-url');
    expect(command).toBeDefined();
  });

  it('returns a temporary play_url for a Douyin aweme', async () => {
    const registry = getRegistry();
    const command = [...registry.values()].find((cmd) => cmd.site === 'douyin' && cmd.name === 'play-url');
    expect(command?.func).toBeDefined();
    if (!command?.func) throw new Error('douyin play-url command not registered');

    fetchDouyinVideoDetailMock.mockResolvedValueOnce({
      aweme_id: '7491639837101743375',
      desc: 'test video',
      video: {
        play_addr: {
          url_list: ['https://example.com/video.mp4?token=temp'],
        },
      },
    });

    const rows = await command.func({ goto: vi.fn().mockResolvedValue(undefined) } as any, {
      'aweme-id': '7491639837101743375',
    });

    expect(fetchDouyinVideoDetailMock).toHaveBeenCalledWith(expect.anything(), '7491639837101743375');
    expect(rows).toEqual([
      {
        aweme_id: '7491639837101743375',
        page_url: 'https://www.douyin.com/video/7491639837101743375',
        play_url: 'https://example.com/video.mp4?token=temp',
      },
    ]);
  });

  it('rejects when no playable url is available', async () => {
    const registry = getRegistry();
    const command = [...registry.values()].find((cmd) => cmd.site === 'douyin' && cmd.name === 'play-url');
    expect(command?.func).toBeDefined();
    if (!command?.func) throw new Error('douyin play-url command not registered');

    fetchDouyinVideoDetailMock.mockResolvedValueOnce({
      aweme_id: '7491639837101743375',
      video: {},
    });

    await expect(
      command.func({ goto: vi.fn().mockResolvedValue(undefined) } as any, {
        'aweme-id': '7491639837101743375',
      }),
    ).rejects.toBeInstanceOf(CliError);
  });
});

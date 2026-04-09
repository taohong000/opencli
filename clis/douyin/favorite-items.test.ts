import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { AuthRequiredError, CliError } from '@jackwener/opencli/errors';
import './favorite-items.js';

describe('douyin favorite-items', () => {
  it('registers the favorite-items command', () => {
    const cmd = getRegistry().get('douyin/favorite-items');
    expect(cmd).toBeDefined();
    expect(cmd?.strategy).toBe('cookie');
    expect(cmd?.args.some((arg) => arg.name === 'collection-id')).toBe(true);
  });

  it('returns favorite items from the Douyin API', async () => {
    const cmd = getRegistry().get('douyin/favorite-items');
    expect(cmd?.func).toBeTypeOf('function');

    const goto = vi.fn().mockResolvedValue(undefined);
    const evaluate = vi.fn().mockResolvedValue({
      aweme_list: [
        {
          aweme_id: '7491639837101743375',
          aweme_type: 0,
          desc: '把工具链打磨顺手，效率会高很多',
          title: '把工具链打磨顺手，效率会高很多',
          create_time: 1744032000,
          author: {
            nickname: 'taohong',
            sec_uid: 'MS4wLjABAAAA-example',
          },
        },
      ],
    });

    const rows = await cmd!.func!(
      { goto, evaluate } as any,
      { 'collection-id': '7485359352206095010', limit: 10 },
    );

    expect(goto).toHaveBeenCalledWith(
      'https://www.douyin.com/user/self?from_tab_name=main&showSubTab=favorite_folder&showTab=favorite_collection&collects_id=7485359352206095010',
    );
    expect(rows).toEqual([
      {
        id: '7491639837101743375',
        collection_id: '7485359352206095010',
        platform: 'douyin',
        type: 'video',
        title: '把工具链打磨顺手，效率会高很多',
        description: '把工具链打磨顺手，效率会高很多',
        author: 'taohong',
        author_sec_uid: 'MS4wLjABAAAA-example',
        url: 'https://www.douyin.com/video/7491639837101743375',
        published_at: '2025-04-07T13:20:00.000Z',
      },
    ]);
  });

  it('maps auth-like failures to AuthRequiredError', async () => {
    const cmd = getRegistry().get('douyin/favorite-items');
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({ status_code: 8, status_msg: 'login required' }),
    } as any;

    await expect(cmd!.func!(page, { 'collection-id': '7485359352206095010' })).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('rejects empty collection ids', async () => {
    const cmd = getRegistry().get('douyin/favorite-items');
    const page = { goto: vi.fn(), evaluate: vi.fn() } as any;

    await expect(cmd!.func!(page, { 'collection-id': '' })).rejects.toBeInstanceOf(CliError);
  });
});

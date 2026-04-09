import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { AuthRequiredError } from '@jackwener/opencli/errors';
import './favorite-collections.js';

describe('douyin favorite-collections', () => {
  it('registers the favorite-collections command', () => {
    const cmd = getRegistry().get('douyin/favorite-collections');
    expect(cmd).toBeDefined();
    expect(cmd?.strategy).toBe('cookie');
    expect(cmd?.columns).toEqual(['id', 'title', 'item_count', 'url']);
  });

  it('returns favorite collections from the Douyin API', async () => {
    const cmd = getRegistry().get('douyin/favorite-collections');
    expect(cmd?.func).toBeTypeOf('function');

    const goto = vi.fn().mockResolvedValue(undefined);
    const evaluate = vi.fn().mockResolvedValue({
      collects_list: [
        {
          collects_id: '7485359352206095010',
          collects_name: '工具',
          aweme_count: 7,
        },
      ],
    });

    const rows = await cmd!.func!({ goto, evaluate } as any, { limit: 20 });

    expect(goto).toHaveBeenCalledWith(
      'https://www.douyin.com/user/self?from_tab_name=main&showSubTab=favorite_folder&showTab=favorite_collection',
    );
    expect(rows).toEqual([
      {
        id: '7485359352206095010',
        platform: 'douyin',
        title: '工具',
        item_count: 7,
        url: 'https://www.douyin.com/user/self?from_tab_name=main&showSubTab=favorite_folder&showTab=favorite_collection&collects_id=7485359352206095010',
      },
    ]);
  });

  it('maps auth-like failures to AuthRequiredError', async () => {
    const cmd = getRegistry().get('douyin/favorite-collections');
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({ status_code: 8, status_msg: 'login required' }),
    } as any;

    await expect(cmd!.func!(page, { limit: 20 })).rejects.toBeInstanceOf(AuthRequiredError);
  });
});

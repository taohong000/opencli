import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { AuthRequiredError } from '@jackwener/opencli/errors';
import './favorite-collections.js';

describe('zhihu favorite-collections', () => {
  it('registers the favorite-collections command', () => {
    const cmd = getRegistry().get('zhihu/favorite-collections');
    expect(cmd).toBeDefined();
    expect(cmd?.strategy).toBe('cookie');
    expect(cmd?.columns).toEqual(['id', 'title', 'item_count', 'visibility', 'updated_at', 'url']);
  });

  it('returns favorite collections from the Zhihu API', async () => {
    const cmd = getRegistry().get('zhihu/favorite-collections');
    expect(cmd?.func).toBeTypeOf('function');

    const goto = vi.fn().mockResolvedValue(undefined);
    const evaluate = vi.fn().mockResolvedValue({
      collections: {
        data: [
          {
            id: 999378387,
            title: '2026q2',
            description: '',
            item_count: 11,
            follower_count: 0,
            updated_time: 1775612087,
            created_time: 1775259845,
            is_default: false,
            is_public: true,
          },
        ],
      },
    });

    const rows = await cmd!.func!(
      { goto, evaluate } as any,
      { limit: 20 },
    );

    expect(goto).toHaveBeenCalledWith('https://www.zhihu.com/');
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([
      {
        id: '999378387',
        platform: 'zhihu',
        title: '2026q2',
        description: '',
        item_count: 11,
        follower_count: 0,
        updated_at: '2026-04-08T01:34:47.000Z',
        created_at: '2026-04-03T23:44:05.000Z',
        visibility: 'public',
        is_default: false,
        url: 'https://www.zhihu.com/collection/999378387',
      },
    ]);
  });

  it('maps auth-like failures to AuthRequiredError', async () => {
    const cmd = getRegistry().get('zhihu/favorite-collections');
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({ meError: 403 }),
    } as any;

    await expect(cmd!.func!(page, { limit: 20 })).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('preserves collection fetch failures as fetch errors', async () => {
    const cmd = getRegistry().get('zhihu/favorite-collections');
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({ collectionsError: 500 }),
    } as any;

    await expect(cmd!.func!(page, { limit: 20 })).rejects.toMatchObject({
      code: 'FETCH_ERROR',
      message: 'Zhihu collections request failed (HTTP 500)',
    });
  });
});

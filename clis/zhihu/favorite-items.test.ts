import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { AuthRequiredError, CliError } from '@jackwener/opencli/errors';
import './favorite-items.js';

describe('zhihu favorite-items', () => {
  it('registers the favorite-items command', () => {
    const cmd = getRegistry().get('zhihu/favorite-items');
    expect(cmd).toBeDefined();
    expect(cmd?.strategy).toBe('cookie');
    expect(cmd?.args.some((arg) => arg.name === 'collection-id')).toBe(true);
  });

  it('returns favorite items from the Zhihu API', async () => {
    const cmd = getRegistry().get('zhihu/favorite-items');
    expect(cmd?.func).toBeTypeOf('function');

    const goto = vi.fn().mockResolvedValue(undefined);
    const evaluate = vi.fn().mockResolvedValue({
      items: [
        {
          content: {
            id: '1828446727',
            type: 'answer',
            excerpt: '我在入行前，在私募实习过，公募量化实习过。',
            url: 'https://www.zhihu.com/question/453225321/answer/1828446727',
            author: { name: '小龙' },
            question: { title: '一个28岁工作了两年的量化研究员，没有做出策略，该怎么办？' },
            created_time: 1618068414,
            updated_time: 1618068534,
          },
        },
      ],
    });

    const rows = await cmd!.func!(
      { goto, evaluate } as any,
      { 'collection-id': '664468176', limit: 3 },
    );

    expect(goto).toHaveBeenCalledWith('https://www.zhihu.com/collection/664468176');
    expect(rows).toEqual([
      {
        id: '1828446727',
        collection_id: '664468176',
        platform: 'zhihu',
        type: 'answer',
        title: '一个28岁工作了两年的量化研究员，没有做出策略，该怎么办？',
        excerpt: '我在入行前，在私募实习过，公募量化实习过。',
        author: '小龙',
        url: 'https://www.zhihu.com/question/453225321/answer/1828446727',
        question_title: '一个28岁工作了两年的量化研究员，没有做出策略，该怎么办？',
        published_at: '2021-04-10T15:26:54.000Z',
        updated_at: '2021-04-10T15:28:54.000Z',
      },
    ]);
  });

  it('maps auth-like failures to AuthRequiredError', async () => {
    const cmd = getRegistry().get('zhihu/favorite-items');
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({ itemsError: 403 }),
    } as any;

    await expect(cmd!.func!(page, { 'collection-id': '664468176' })).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('rejects non-numeric collection ids', async () => {
    const cmd = getRegistry().get('zhihu/favorite-items');
    const page = { goto: vi.fn(), evaluate: vi.fn() } as any;

    await expect(
      cmd!.func!(page, { 'collection-id': "abc'; alert(1); //" }),
    ).rejects.toBeInstanceOf(CliError);
  });
});

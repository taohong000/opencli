import { AuthRequiredError, CliError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';

type ZhihuCollection = {
  id: string | number;
  title?: string;
  description?: string;
  item_count?: number;
  follower_count?: number;
  updated_time?: number;
  created_time?: number;
  is_default?: boolean;
  is_public?: boolean;
};

type EvaluateResult = {
  meError?: number;
  collectionsError?: number;
  collections?: {
    data?: ZhihuCollection[];
  };
};

function toIsoTime(value: number | undefined): string | null {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

cli({
  site: 'zhihu',
  name: 'favorite-collections',
  description: 'List my Zhihu favorite collections',
  domain: 'www.zhihu.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'limit', type: 'int', default: 20, help: 'Number of collections to fetch' },
  ],
  columns: ['id', 'title', 'item_count', 'visibility', 'updated_at', 'url'],
  func: async (page, kwargs) => {
    const limit = Math.max(1, Number(kwargs.limit ?? 20));

    await page.goto('https://www.zhihu.com/');

    const data = await page.evaluate(`
      (async () => {
        const meResponse = await fetch('https://www.zhihu.com/api/v4/me', { credentials: 'include' });
        if (!meResponse.ok) {
          return { meError: meResponse.status };
        }

        const me = await meResponse.json();
        const url = 'https://www.zhihu.com/api/v4/people/' + me.url_token + '/collections?offset=0&limit=' + ${JSON.stringify(limit)};
        const collectionsResponse = await fetch(url, { credentials: 'include' });
        if (!collectionsResponse.ok) {
          return { collectionsError: collectionsResponse.status };
        }

        return { collections: await collectionsResponse.json() };
      })()
    `) as EvaluateResult | null;

    if (!data) {
      throw new CliError('FETCH_ERROR', 'Zhihu collections request failed');
    }

    if (data.meError === 401 || data.meError === 403 || data.collectionsError === 401 || data.collectionsError === 403) {
      throw new AuthRequiredError('www.zhihu.com', 'Failed to fetch collections from Zhihu');
    }

    if (data.meError) {
      throw new CliError('FETCH_ERROR', `Zhihu profile request failed (HTTP ${data.meError})`);
    }

    if (data.collectionsError) {
      throw new CliError('FETCH_ERROR', `Zhihu collections request failed (HTTP ${data.collectionsError})`);
    }

    const collections = data.collections?.data ?? [];
    return collections.map((item) => ({
      id: String(item.id),
      platform: 'zhihu',
      title: item.title ?? '',
      description: item.description ?? '',
      item_count: item.item_count ?? 0,
      follower_count: item.follower_count ?? 0,
      updated_at: toIsoTime(item.updated_time),
      created_at: toIsoTime(item.created_time),
      visibility: item.is_public ? 'public' : 'private',
      is_default: Boolean(item.is_default),
      url: `https://www.zhihu.com/collection/${String(item.id)}`,
    }));
  },
});

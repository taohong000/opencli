import { AuthRequiredError, CliError, CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  DOUYIN_FAVORITE_COLLECTIONS_URL,
  fetchDouyinFavoriteCollections,
} from './_shared/favorite-api.js';

cli({
  site: 'douyin',
  name: 'favorite-collections',
  description: 'List my Douyin favorite collections',
  domain: 'www.douyin.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'limit', type: 'int', default: 20, help: 'Number of collections to fetch' },
  ],
  columns: ['id', 'title', 'item_count', 'url'],
  func: async (page, kwargs) => {
    const limit = Math.max(1, Number(kwargs.limit ?? 20));

    await page.goto(DOUYIN_FAVORITE_COLLECTIONS_URL);
    let data;
    try {
      data = await fetchDouyinFavoriteCollections(page, limit);
    } catch (error) {
      if (error instanceof CommandExecutionError && error.message.includes('Douyin API error 8')) {
        throw new AuthRequiredError('www.douyin.com', 'Failed to fetch collections from Douyin');
      }
      throw error;
    }

    if (!data) {
      throw new CliError('FETCH_ERROR', 'Douyin collections request failed');
    }

    return (data.collections ?? []).map((item) => ({
      id: item.id,
      platform: 'douyin',
      title: item.title,
      item_count: item.item_count,
      url: item.url,
    }));
  },
});

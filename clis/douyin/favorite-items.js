import { AuthRequiredError, CliError, CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  DOUYIN_FAVORITE_COLLECTIONS_URL,
  fetchDouyinFavoriteItems,
  resolveDouyinFavoriteCollectionId,
} from './_shared/favorite-api.js';

function toIsoTime(value) {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

cli({
  site: 'douyin',
  name: 'favorite-items',
  description: 'List items from a Douyin favorite collection',
  domain: 'www.douyin.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'collection-id', positional: true, required: true, help: 'Douyin favorite collection ID' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum number of items to fetch' },
    { name: 'all', type: 'boolean', help: 'Fetch all items in the collection' },
  ],
  columns: ['id', 'type', 'title', 'author', 'published_at', 'url'],
  func: async (page, kwargs) => {
    const collectionId = String(kwargs['collection-id'] ?? '').trim();
    if (!collectionId) {
      throw new CliError('INVALID_INPUT', 'Collection ID is required');
    }

    const limit = Math.max(1, Number(kwargs.limit ?? 20));
    const fetchAll = Boolean(kwargs.all);

    await page.goto(`${DOUYIN_FAVORITE_COLLECTIONS_URL}&collects_id=${encodeURIComponent(collectionId)}`);
    let data;
    let resolvedCollectionId = collectionId;
    try {
      resolvedCollectionId = await resolveDouyinFavoriteCollectionId(page, collectionId);
      data = await fetchDouyinFavoriteItems(page, resolvedCollectionId, limit, fetchAll);
    } catch (error) {
      if (error instanceof CommandExecutionError && error.message.includes('Douyin API error 8')) {
        throw new AuthRequiredError('www.douyin.com', 'Failed to fetch favorite items from Douyin');
      }
      throw error;
    }

    if (!data) {
      throw new CliError('FETCH_ERROR', 'Douyin favorite items request failed');
    }

    return (data.items ?? []).map((item) => ({
      id: item.awemeId,
      collection_id: resolvedCollectionId,
      platform: 'douyin',
      type: item.itemType,
      title: item.title,
      description: item.description,
      author: item.author?.nickname ?? '',
      author_sec_uid: item.author?.secUid ?? null,
      url: item.url,
      published_at: toIsoTime(item.createTime),
    }));
  },
});

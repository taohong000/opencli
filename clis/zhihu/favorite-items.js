import { AuthRequiredError, CliError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';

function toIsoTime(value) {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

cli({
  site: 'zhihu',
  name: 'favorite-items',
  description: 'List items from a Zhihu favorite collection',
  domain: 'www.zhihu.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'collection-id', positional: true, required: true, help: 'Zhihu collection ID' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum number of items to fetch' },
    { name: 'all', type: 'boolean', help: 'Fetch all items in the collection' },
  ],
  columns: ['id', 'type', 'title', 'author', 'published_at', 'url'],
  func: async (page, kwargs) => {
    const collectionId = String(kwargs['collection-id'] ?? '');
    if (!/^\d+$/.test(collectionId)) {
      throw new CliError('INVALID_INPUT', 'Collection ID must be numeric');
    }

    const limit = Math.max(1, Number(kwargs.limit ?? 20));
    const fetchAll = Boolean(kwargs.all);

    await page.goto(`https://www.zhihu.com/collection/${collectionId}`);

    const data = await page.evaluate(`
      (async () => {
        const limit = ${JSON.stringify(limit)};
        const fetchAll = ${JSON.stringify(fetchAll)};
        const allItems = [];
        let offset = 0;
        const pageSize = Math.min(fetchAll ? 20 : limit, 20);

        while (fetchAll || allItems.length < limit) {
          const response = await fetch(
            'https://www.zhihu.com/api/v4/collections/${collectionId}/items?offset=' + offset + '&limit=' + pageSize,
            { credentials: 'include' }
          );

          if (!response.ok) {
            return { itemsError: response.status };
          }

          const payload = await response.json();
          const pageItems = Array.isArray(payload.data) ? payload.data : [];
          allItems.push(...pageItems);

          const isEnd = payload.paging?.is_end ?? pageItems.length < pageSize;
          if (isEnd || pageItems.length === 0) {
            break;
          }

          offset += pageItems.length;
          if (!fetchAll && allItems.length >= limit) {
            break;
          }
        }

        return { items: fetchAll ? allItems : allItems.slice(0, limit) };
      })()
    `);

    if (!data) {
      throw new CliError('FETCH_ERROR', 'Zhihu collection items request failed');
    }

    if (data.itemsError === 401 || data.itemsError === 403) {
      throw new AuthRequiredError('www.zhihu.com', 'Failed to fetch collection items from Zhihu');
    }

    if (data.itemsError) {
      throw new CliError('FETCH_ERROR', `Zhihu collection items request failed (HTTP ${data.itemsError})`);
    }

    return (data.items ?? []).map((item) => {
      const content = item.content ?? {};
      return {
        id: String(content.id ?? ''),
        collection_id: collectionId,
        platform: 'zhihu',
        type: content.type ?? 'unknown',
        title: content.question?.title ?? content.title ?? '',
        excerpt: content.excerpt ?? '',
        author: content.author?.name ?? '',
        url: content.url ?? '',
        question_title: content.question?.title ?? null,
        published_at: toIsoTime(content.created_time),
        updated_at: toIsoTime(content.updated_time),
      };
    });
  },
});

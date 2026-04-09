import type { IPage } from '@jackwener/opencli/types';
import { browserFetch } from './browser-fetch.js';

const DOUYIN_FAVORITE_COLLECTIONS_URL =
  'https://www.douyin.com/user/self?from_tab_name=main&showSubTab=favorite_folder&showTab=favorite_collection';

interface DouyinFavoriteCollection {
  id: string;
  numeric_id?: string | null;
  title: string;
  item_count: number;
  url: string;
}

interface DouyinFavoriteItem {
  awemeId: string;
  itemType: string;
  title: string;
  description: string;
  url: string;
  createTime: number | null;
  author?: { nickname?: string | null; secUid?: string | null };
}

function buildFavoriteQuery(extraParams: Record<string, string>): string {
  return new URLSearchParams({
    device_platform: 'webapp',
    aid: '6383',
    channel: 'channel_pc_web',
    update_version_code: '170400',
    pc_client_type: '1',
    version_code: '170400',
    version_name: '17.4.0',
    cookie_enabled: 'true',
    screen_width: '1920',
    screen_height: '1080',
    browser_language: 'zh-CN',
    browser_platform: 'Win32',
    browser_name: 'Chrome',
    browser_version: '130.0.0.0',
    browser_online: 'true',
    engine_name: 'Blink',
    engine_version: '130.0.0.0',
    os_name: 'Windows',
    os_version: '10',
    cpu_core_num: '8',
    device_memory: '8',
    platform: 'PC',
    downlink: '10',
    effective_type: '4g',
    round_trip_time: '100',
    ...extraParams,
  }).toString();
}

function parseDouyinTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return Math.floor(parsed / 1000);
}

function mapCollection(item: Record<string, unknown>): DouyinFavoriteCollection | null {
  const numericId = String(item.collects_id ?? '').trim();
  const id = String(item.collects_id_str ?? item.collects_id ?? '').trim();
  const title = String(item.collects_name ?? item.title ?? item.name ?? '').trim();
  if (!id || !title) return null;

  const count = item.total_number ?? item.aweme_count ?? item.count ?? item.video_count ?? 0;
  return {
    id,
    numeric_id: numericId || null,
    title,
    item_count: Number.isFinite(Number(count)) ? Number(count) : 0,
    url: `${DOUYIN_FAVORITE_COLLECTIONS_URL}&collects_id=${encodeURIComponent(id)}`,
  };
}

function isFavoriteCollection(value: DouyinFavoriteCollection | null): value is DouyinFavoriteCollection {
  return value !== null;
}

function mapItem(item: Record<string, unknown>): DouyinFavoriteItem | null {
  const awemeId = String(item.aweme_id ?? item.awemeId ?? '').trim();
  const desc = [item.desc, item.description, item.title].find((value) => typeof value === 'string' && value.trim());
  if (!awemeId || typeof desc !== 'string') return null;

  const author =
    typeof item.author === 'object' && item.author && !Array.isArray(item.author)
      ? (item.author as Record<string, unknown>)
      : {};
  const secUid = author.sec_uid ?? author.secUid ?? null;
  const nickname = author.nickname ?? author.name ?? null;
  const awemeType = Number(item.aweme_type ?? item.awemeType ?? 0);
  const itemType = awemeType === 68 ? 'note' : 'video';
  const createTime = parseDouyinTimestamp(item.create_time ?? item.createTime);

  return {
    awemeId,
    itemType,
    title: desc.trim(),
    description: desc.trim(),
    url: `https://www.douyin.com/${itemType}/${awemeId}`,
    createTime,
    author: {
      nickname: typeof nickname === 'string' ? nickname : null,
      secUid: typeof secUid === 'string' ? secUid : null,
    },
  };
}

function isFavoriteItem(value: DouyinFavoriteItem | null): value is DouyinFavoriteItem {
  return value !== null;
}

export async function resolveDouyinFavoriteCollectionId(page: IPage, requestedId: string): Promise<string> {
  const collections = (await fetchDouyinFavoriteCollections(page, 100)).collections ?? [];
  const match = collections.find((item) => item.id === requestedId || item.numeric_id === requestedId);
  return match?.id ?? requestedId;
}

async function findSignedFavoriteItemsUrl(page: IPage, collectionId: string): Promise<string | null> {
  const result = await page.evaluate(`
    (() => {
      const collectionId = ${JSON.stringify(collectionId)};
      const resources = performance.getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => name.includes('/aweme/v1/web/collects/video/list/'));
      return resources.find((name) => name.includes('collects_id=' + collectionId)) ?? null;
    })()
  `);
  return typeof result === 'string' && result ? result : null;
}

export async function fetchDouyinFavoriteCollections(page: IPage, limit: number) {
  const url = `https://www.douyin.com/aweme/v1/web/collects/list/?${buildFavoriteQuery({
    cursor: '0',
    count: String(limit),
  })}`;
  const payload = (await browserFetch(page, 'GET', url, {
    headers: { referer: DOUYIN_FAVORITE_COLLECTIONS_URL },
  })) as { collects_list?: Array<Record<string, unknown>> } | null;

  const collections = Array.isArray(payload?.collects_list)
    ? payload.collects_list.map(mapCollection).filter(isFavoriteCollection)
    : [];

  return { collections };
}

export async function fetchDouyinFavoriteItems(page: IPage, collectionId: string, limit: number, fetchAll: boolean) {
  const signedUrl = await findSignedFavoriteItemsUrl(page, collectionId);
  const items: DouyinFavoriteItem[] = [];
  let cursor = 0;

  while (fetchAll || items.length < limit) {
    const pageSize = Math.min(fetchAll ? 20 : limit, 20);
    const url = cursor === 0 && signedUrl
      ? signedUrl
      : `https://www.douyin.com/aweme/v1/web/collects/video/list/?${buildFavoriteQuery({
          collects_id: collectionId,
          cursor: String(cursor),
          count: String(pageSize),
        })}`;
    const payload = (await browserFetch(page, 'GET', url, {
      headers: { referer: `${DOUYIN_FAVORITE_COLLECTIONS_URL}&collects_id=${encodeURIComponent(collectionId)}` },
    })) as {
      aweme_list?: Array<Record<string, unknown>>;
      has_more?: boolean | number;
      max_cursor?: number | string;
      cursor?: number | string;
    } | null;

    const pageItems = Array.isArray(payload?.aweme_list) ? payload.aweme_list.map(mapItem).filter(isFavoriteItem) : [];
    items.push(...pageItems);

    const hasMore = payload?.has_more === true || payload?.has_more === 1;
    const nextCursor = Number(payload?.max_cursor ?? payload?.cursor ?? cursor);
    if (!hasMore || pageItems.length === 0 || nextCursor === cursor || signedUrl) break;

    cursor = nextCursor;
  }

  return { items: fetchAll ? items : items.slice(0, limit) };
}

export { DOUYIN_FAVORITE_COLLECTIONS_URL };

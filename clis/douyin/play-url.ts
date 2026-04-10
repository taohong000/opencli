import { CliError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';
import type { DouyinVideo } from './_shared/public-api.js';
import { fetchDouyinVideoDetail } from './_shared/public-api.js';

function getPreferredPlayUrl(detail: DouyinVideo | null): string {
  const candidates = [
    ...(detail?.video?.play_addr?.url_list ?? []),
    ...(detail?.video?.download_addr?.url_list ?? []),
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  candidates.sort((left, right) => {
    const leftScore = left.includes('watermark=0') ? 0 : 1;
    const rightScore = right.includes('watermark=0') ? 0 : 1;
    return leftScore - rightScore;
  });

  return candidates[0] ?? '';
}

cli({
  site: 'douyin',
  name: 'play-url',
  description: 'Get a temporary play URL for a Douyin aweme',
  domain: 'www.douyin.com',
  strategy: Strategy.COOKIE,
  args: [{ name: 'aweme-id', positional: true, required: true, help: 'Douyin aweme ID' }],
  columns: ['aweme_id', 'page_url', 'play_url'],
  func: async (page, kwargs) => {
    const awemeId = String(kwargs['aweme-id'] ?? '').trim();
    if (!awemeId) {
      throw new CliError('INVALID_INPUT', 'aweme-id is required');
    }

    const detail = await fetchDouyinVideoDetail(page, awemeId);
    const playUrl = getPreferredPlayUrl(detail);
    if (!playUrl) {
      throw new CliError('FETCH_ERROR', `No playable URL found for aweme ${awemeId}`);
    }

    return [
      {
        aweme_id: awemeId,
        page_url: `https://www.douyin.com/video/${awemeId}`,
        play_url: playUrl,
      },
    ];
  },
});

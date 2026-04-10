import type { IPage } from '@jackwener/opencli/types';
import { browserFetch } from './browser-fetch.js';

export interface DouyinComment {
  text?: string;
  digg_count?: number;
  user?: {
    nickname?: string;
  };
}

export interface DouyinVideo {
  aweme_id: string;
  desc?: string;
  video?: {
    vid?: string;
    duration?: number;
    download_addr?: {
      uri?: string;
      url_list?: string[];
    };
    play_addr?: {
      uri?: string;
      url_list?: string[];
    };
  };
  music?: {
    play_url?: {
      url_list?: string[];
    };
  };
  statistics?: {
    digg_count?: number;
  };
}

export interface DouyinVideoListResponse {
  aweme_list?: DouyinVideo[];
}

export interface DouyinCommentListResponse {
  comments?: DouyinComment[];
}

export interface DouyinVideoDetailResponse {
  aweme_detail?: DouyinVideo | null;
}

export async function fetchDouyinUserVideos(
  page: IPage,
  secUid: string,
  count: number,
): Promise<DouyinVideo[]> {
  const params = new URLSearchParams({
    sec_user_id: secUid,
    max_cursor: '0',
    count: String(count),
    aid: '6383',
  });

  const data = await browserFetch(
    page,
    'GET',
    `https://www.douyin.com/aweme/v1/web/aweme/post/?${params.toString()}`,
    {
      headers: { referer: 'https://www.douyin.com/' },
    },
  ) as DouyinVideoListResponse;

  return data.aweme_list || [];
}

export async function fetchDouyinVideoDetail(
  page: IPage,
  awemeId: string,
): Promise<DouyinVideo | null> {
  const params = new URLSearchParams({
    aweme_id: awemeId,
    aid: '6383',
  });

  const data = await browserFetch(
    page,
    'GET',
    `https://www.douyin.com/aweme/v1/web/aweme/detail/?${params.toString()}`,
    {
      headers: { referer: `https://www.douyin.com/video/${awemeId}` },
    },
  ) as DouyinVideoDetailResponse;

  return data.aweme_detail ?? null;
}

export async function fetchDouyinComments(
  page: IPage,
  awemeId: string,
  count: number,
): Promise<Array<{ text: string; digg_count: number; nickname: string }>> {
  const params = new URLSearchParams({
    aweme_id: awemeId,
    count: String(count),
    cursor: '0',
    aid: '6383',
  });

  const data = await browserFetch(
    page,
    'GET',
    `https://www.douyin.com/aweme/v1/web/comment/list/?${params.toString()}`,
    {
      headers: { referer: 'https://www.douyin.com/' },
    },
  ) as DouyinCommentListResponse;

  return (data.comments || []).slice(0, count).map((comment) => ({
    text: comment.text || '',
    digg_count: comment.digg_count ?? 0,
    nickname: comment.user?.nickname || '',
  }));
}

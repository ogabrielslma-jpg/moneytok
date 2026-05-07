// Biblioteca pra integração com Apify (TikTok scrapers)
// Usado por: src/app/api/tiktok-lookup/route.ts

import type { TikTokProfile } from './landing-config';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ENABLE_APIFY = process.env.ENABLE_APIFY === 'true';
const PROFILE_ACTOR = 'automation-lab~tiktok-profile-scraper';
const VIDEOS_ACTOR = 'clockworks~tiktok-scraper';

export type { TikTokProfile };

// Tipo de video do TikTok (campos extraidos do clockworks scraper)
export type TikTokVideo = {
  video_id: string;
  caption: string;
  cover_url: string;
  video_url: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  duration: number;          // em segundos
  posted_at: string;          // ISO date
  music_name: string;
  music_author: string;
  hashtags: string[];
  is_pinned: boolean;
};

export async function fetchTikTokProfile(
  username: string
): Promise<TikTokProfile | null> {
  // Limpa o @ se vier com ele
  const cleanUsername = username.replace(/^@/, '').trim();

  // Se Apify não tá habilitado ou sem token, retorna null
  if (!ENABLE_APIFY || !APIFY_TOKEN) {
    console.log('[apify] disabled or no token, skipping');
    return null;
  }

  try {
    const url = `https://api.apify.com/v2/acts/${PROFILE_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profiles: [`@${cleanUsername}`],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[apify] HTTP error', response.status, errorText.slice(0, 200));
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[apify] empty response for', cleanUsername);
      return null;
    }

    const p = data[0];

    // MAPEIA campos do Apify (camelCase) pro tipo TikTokProfile (snake_case)
    return {
      username: p.username || cleanUsername,
      display_name: p.displayName || p.username || cleanUsername,
      avatar_url: p.avatarUrl || p.avatar || '',
      followers: p.followerCount || 0,
      following: p.followingCount || 0,
      total_likes: p.likesCount || 0,
      bio: p.bio || '',
      verified: p.isVerified || false,
    };
  } catch (error) {
    console.error('[apify] fetch error:', error);
    return null;
  }
}


// Busca os ultimos N videos de um perfil TikTok via clockworks scraper
export async function fetchTikTokVideos(
  username: string,
  limit: number = 3
): Promise<TikTokVideo[] | null> {
  const cleanUsername = username.replace(/^@/, '').trim();

  if (!ENABLE_APIFY || !APIFY_TOKEN) {
    console.log('[apify] disabled or no token, skipping videos');
    return null;
  }

  try {
    const url = `https://api.apify.com/v2/acts/${VIDEOS_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profiles: [cleanUsername],
        resultsPerPage: limit,
        shouldDownloadCovers: false,
        shouldDownloadVideos: false,
        shouldDownloadSubtitles: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[apify] videos HTTP error', response.status, errorText.slice(0, 200));
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[apify] no videos for', cleanUsername);
      return [];
    }

    // Mapeia campos do clockworks (camelCase) -> TikTokVideo (snake_case)
    return data.slice(0, limit).map((v: any) => ({
      video_id: String(v.id || ''),
      caption: v.text || '',
      cover_url: v.videoMeta?.coverUrl || v.videoMeta?.originalCoverUrl || '',
      video_url: v.webVideoUrl || '',
      views: v.playCount || 0,
      likes: v.diggCount || 0,
      comments: v.commentCount || 0,
      shares: v.shareCount || 0,
      duration: v.videoMeta?.duration || 0,
      posted_at: v.createTimeISO || '',
      music_name: v.musicMeta?.musicName || '',
      music_author: v.musicMeta?.musicAuthor || '',
      hashtags: Array.isArray(v.hashtags) ? v.hashtags.map((h: any) => h.name || h).filter(Boolean) : [],
      is_pinned: !!v.isPinned,
    }));
  } catch (error) {
    console.error('[apify] fetchTikTokVideos error:', error);
    return null;
  }
}
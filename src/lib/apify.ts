// Biblioteca pra integração com Apify (TikTok scrapers)
// Usado por: src/app/api/tiktok-lookup/route.ts

import type { TikTokProfile } from './landing-config';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ENABLE_APIFY = process.env.ENABLE_APIFY === 'true';
const PROFILE_ACTOR = 'automation-lab~tiktok-profile-scraper';

export type { TikTokProfile };

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

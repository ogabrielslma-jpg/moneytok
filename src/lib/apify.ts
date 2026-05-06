// Biblioteca pra integração com Apify (TikTok scrapers)
// Usado por: src/app/api/tiktok-lookup/route.ts

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ENABLE_APIFY = process.env.ENABLE_APIFY === 'true';
const PROFILE_ACTOR = 'automation-lab~tiktok-profile-scraper';

export type TikTokProfile = {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
  isVerified: boolean;
  profileUrl: string;
};

export async function fetchTikTokProfile(
  username: string
): Promise<TikTokProfile | null> {
  // Limpa o @ se vier com ele
  const cleanUsername = username.replace(/^@/, '').trim();

  // Se Apify não tá habilitado ou sem token, retorna null
  // (o caller vai cair no fallback mock)
  if (!ENABLE_APIFY || !APIFY_TOKEN) {
    console.log('[apify] disabled or no token, skipping');
    return null;
  }

  try {
    // Chama o actor do Apify de forma síncrona
    // run-sync-get-dataset-items espera o run terminar e retorna o output
    const url = `https://api.apify.com/v2/acts/${PROFILE_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: [cleanUsername],
      }),
    });

    if (!response.ok) {
      console.error('[apify] HTTP error', response.status);
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[apify] empty response for', cleanUsername);
      return null;
    }

    const profile = data[0];

    // Normaliza os campos pro nosso formato
    return {
      username: profile.username || cleanUsername,
      displayName: profile.displayName || cleanUsername,
      bio: profile.bio || '',
      avatar: profile.avatar || profile.avatarUrl || '',
      followerCount: profile.followerCount || 0,
      followingCount: profile.followingCount || 0,
      likesCount: profile.likesCount || 0,
      videoCount: profile.videoCount || 0,
      isVerified: profile.isVerified || false,
      profileUrl:
        profile.profileUrl || `https://www.tiktok.com/@${cleanUsername}`,
    };
  } catch (error) {
    console.error('[apify] fetch error:', error);
    return null;
  }
}

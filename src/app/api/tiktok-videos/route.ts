// API de busca de videos do TikTok via Apify
// Cache em memoria 24h + rate limit 5/10min/IP

import { NextRequest, NextResponse } from 'next/server';
import { fetchTikTokVideos, type TikTokVideo } from '@/lib/apify';

type CacheEntry = { videos: TikTokVideo[]; cachedAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

type RateEntry = { count: number; windowStart: number };
const rateLimits = new Map<string, RateEntry>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 10 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW) {
    rateLimits.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || '').replace(/^@/, '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(body.limit) || 3, 1), 10);

    if (!username || username.length < 2 || !/^[a-z0-9_.]+$/.test(username)) {
      return NextResponse.json({ error: 'Username invalido' }, { status: 400 });
    }

    const cacheKey = `${username}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      console.log('[tiktok-videos] cache hit:', username);
      return NextResponse.json({ videos: cached.videos, cached: true });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }

    console.log('[tiktok-videos] fetching:', username, 'limit:', limit);
    const videos = await fetchTikTokVideos(username, limit);

    if (videos === null) {
      return NextResponse.json(
        { error: 'Nao foi possivel buscar os videos. Tente novamente.' },
        { status: 502 }
      );
    }

    cache.set(cacheKey, { videos, cachedAt: Date.now() });
    return NextResponse.json({ videos, cached: false });
  } catch (error) {
    console.error('[tiktok-videos] error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

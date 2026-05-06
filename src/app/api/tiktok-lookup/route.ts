import { NextRequest, NextResponse } from 'next/server';
import { fetchTikTokProfile, TikTokProfile } from '@/lib/apify';

// Cache em memória — chave: username, valor: { profile, timestamp }
// Em ambiente serverless (Vercel), cada função tem sua própria memória,
// então o cache reseta às vezes. Tudo bem — economiza nos hits frequentes.
const cache = new Map<string, { profile: TikTokProfile; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Rate limit em memória — chave: IP, valor: array de timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 min

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  // Remove timestamps fora da janela
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

function isValidUsername(username: string): boolean {
  // TikTok usernames: 2-24 chars, alphanumeric + underscore + period
  const cleaned = username.replace(/^@/, '').trim();
  return /^[a-zA-Z0-9._]{2,24}$/.test(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = (body.username || '').toString().trim();

    // Validação
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Invalid username format', profile: null },
        { status: 400 }
      );
    }

    const cleanUsername = username.replace(/^@/, '').toLowerCase();

    // Cache check
    const cached = cache.get(cleanUsername);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        profile: cached.profile,
        source: 'cache',
      });
    }

    // Rate limit check
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in 10 minutes.', profile: null },
        { status: 429 }
      );
    }

    // Chama Apify (ou retorna null se desligado)
    const profile = await fetchTikTokProfile(cleanUsername);

    if (profile) {
      // Salva no cache
      cache.set(cleanUsername, { profile, timestamp: Date.now() });
      return NextResponse.json({ profile, source: 'apify' });
    }

    // Apify desligado ou falhou — retorna null pro frontend cair no mock
    return NextResponse.json({ profile: null, source: 'unavailable' });
  } catch (error) {
    console.error('[tiktok-lookup] error:', error);
    return NextResponse.json(
      { error: 'Internal error', profile: null },
      { status: 500 }
    );
  }
}

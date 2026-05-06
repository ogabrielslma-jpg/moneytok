import LandingClient from "./LandingClient";
import { DEFAULT_LANDING_CONFIG, type LandingConfig } from "@/lib/landing-config";

// Não cacheia entre requests — sempre pega a versão mais recente
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getInitialConfig(): Promise<LandingConfig> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_LANDING_CONFIG;

  try {
    // Fetch direto na REST API do Supabase (read público via RLS)
    const res = await fetch(
      `${url}/rest/v1/landing_config?id=eq.main&select=data`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return DEFAULT_LANDING_CONFIG;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return DEFAULT_LANDING_CONFIG;

    const raw = rows[0]?.data || {};
    // Migra config antiga (sem desktop/mobile) — mesmo merge do landing-config.ts
    const merged: any = { ...DEFAULT_LANDING_CONFIG, ...raw };
    if (!raw?.desktop || typeof raw.desktop !== "object") {
      merged.desktop = {
        logo_size: raw?.logo_size ?? DEFAULT_LANDING_CONFIG.desktop.logo_size,
        logo_align: raw?.logo_align ?? DEFAULT_LANDING_CONFIG.desktop.logo_align,
        background_position_x: raw?.background_position_x ?? DEFAULT_LANDING_CONFIG.desktop.background_position_x,
        background_position_y: raw?.background_position_y ?? DEFAULT_LANDING_CONFIG.desktop.background_position_y,
        background_size: raw?.background_size ?? DEFAULT_LANDING_CONFIG.desktop.background_size,
        background_overlay_opacity: raw?.background_overlay_opacity ?? DEFAULT_LANDING_CONFIG.desktop.background_overlay_opacity,
        background_fit: raw?.background_fit ?? DEFAULT_LANDING_CONFIG.desktop.background_fit,
      };
    }
    if (!raw?.mobile || typeof raw.mobile !== "object") {
      merged.mobile = { ...merged.desktop };
    }
    if (raw?.banner_top_text && !merged.banner_text) {
      merged.banner_enabled = !!raw.banner_top_enabled;
      merged.banner_mode = "text";
      merged.banner_text = raw.banner_top_text;
    }

    if (!raw?.headline_html && raw?.headline) {
      merged.headline_html = raw.headline;
    }

    if (!Array.isArray(raw?.questions) || raw.questions.length === 0) {
      merged.questions = DEFAULT_LANDING_CONFIG.questions;
    }

    if (!raw?.dashboard || typeof raw.dashboard !== "object") {
      merged.dashboard = DEFAULT_LANDING_CONFIG.dashboard;
    } else {
      merged.dashboard = { ...DEFAULT_LANDING_CONFIG.dashboard, ...raw.dashboard };
      if (!Array.isArray(merged.dashboard.feed_posts) || merged.dashboard.feed_posts.length === 0) {
        merged.dashboard.feed_posts = DEFAULT_LANDING_CONFIG.dashboard.feed_posts;
      }
    }

    return merged as LandingConfig;
  } catch {
    return DEFAULT_LANDING_CONFIG;
  }
}

export default async function Page() {
  const initialConfig = await getInitialConfig();
  return <LandingClient initialConfig={initialConfig} />;
}

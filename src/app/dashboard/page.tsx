import DashboardClient from "./DashboardClient";
import { DEFAULT_LANDING_CONFIG, type LandingConfig } from "@/lib/landing-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getInitialConfig(): Promise<LandingConfig> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_LANDING_CONFIG;

  try {
    const res = await fetch(
      `${url}/rest/v1/landing_config?id=eq.main&select=data`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return DEFAULT_LANDING_CONFIG;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return DEFAULT_LANDING_CONFIG;

    const raw = rows[0]?.data || {};
    const merged: any = { ...DEFAULT_LANDING_CONFIG, ...raw };

    if (!raw?.dashboard || typeof raw.dashboard !== "object") {
      merged.dashboard = DEFAULT_LANDING_CONFIG.dashboard;
    } else {
      merged.dashboard = { ...DEFAULT_LANDING_CONFIG.dashboard, ...raw.dashboard };
      if (!Array.isArray(merged.dashboard.feed_posts) || merged.dashboard.feed_posts.length === 0) {
        merged.dashboard.feed_posts = DEFAULT_LANDING_CONFIG.dashboard.feed_posts;
      }
    }

    // Para o logo "same_as_landing", herda da landing
    if (merged.dashboard.logo_mode === "same_as_landing") {
      merged.dashboard.logo_primary = merged.logo_primary;
      merged.dashboard.logo_secondary = merged.logo_secondary;
      merged.dashboard.logo_image_url = merged.logo_image_url;
    }

    return merged as LandingConfig;
  } catch {
    return DEFAULT_LANDING_CONFIG;
  }
}

export default async function Page() {
  const initialConfig = await getInitialConfig();
  return <DashboardClient initialConfig={initialConfig} />;
}

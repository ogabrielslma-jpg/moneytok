import { ImageResponse } from "next/og";
import { fetchLandingConfig } from "@/lib/landing-config";

// Gera favicon dinâmico baseado no logo configurado no admin

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Icon() {
  let config;
  try {
    config = await fetchLandingConfig();
  } catch {
    config = null;
  }

  const primary = config?.logo_primary || "FOOT";
  const secondary = config?.logo_secondary || "PRIV";
  const colorPrimary = config?.color_primary || "#22c55e";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          borderRadius: 12,
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: colorPrimary,
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          {primary.slice(0, 4)}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#f5f1ea",
            letterSpacing: 4,
            lineHeight: 1,
            marginTop: 2,
          }}
        >
          {secondary.slice(0, 4)}
        </div>
      </div>
    ),
    { ...size }
  );
}

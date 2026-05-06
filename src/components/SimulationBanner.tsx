"use client";

import type { LandingConfig } from "@/lib/landing-config";

export default function LandingBanner({ config }: { config: LandingConfig }) {
  if (!config.banner_enabled) return null;

  const inner =
    config.banner_mode === "image" && config.banner_image_url ? (
      <img
        src={config.banner_image_url}
        alt="banner"
        className="max-h-12 w-auto mx-auto object-contain"
      />
    ) : (
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
        {config.banner_text}
      </span>
    );

  const wrapperStyle = {
    backgroundColor: config.banner_bg_color,
    color: config.banner_text_color,
  };
  const wrapperClasses = "text-center py-2 px-4 sticky top-0 z-50 flex items-center justify-center";

  if (config.banner_link_url) {
    return (
      <a
        href={config.banner_link_url}
        target="_blank"
        rel="noopener noreferrer"
        className={wrapperClasses + " hover:opacity-90 transition"}
        style={wrapperStyle}
      >
        {inner}
      </a>
    );
  }

  return (
    <div className={wrapperClasses} style={wrapperStyle}>
      {inner}
    </div>
  );
}

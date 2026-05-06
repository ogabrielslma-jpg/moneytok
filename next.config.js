/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Vercel já verifica tipo no PR. Aqui só queremos que o build compile.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
};

module.exports = nextConfig;

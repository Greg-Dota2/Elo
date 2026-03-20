import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'steamcdn-a.akamaihd.net' },
      { protocol: 'https', hostname: 'cdn.cloudflare.steamstatic.com' },
      { protocol: 'https', hostname: 'cdn.steamusercontent.com' },
      { protocol: 'https', hostname: '*.steamstatic.com' },
      { protocol: 'https', hostname: '*.akamaihd.net' },
      { protocol: 'https', hostname: 'cdn.pandascore.co' },
      { protocol: 'https', hostname: 'cdn-api.pandascore.co' },
      { protocol: 'https', hostname: '*.pandascore.co' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'dota2protips.com' },
      { protocol: 'https', hostname: '*.dota2protips.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;

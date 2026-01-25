/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow larger uploads for insurance cards
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Logging configuration for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

module.exports = nextConfig;

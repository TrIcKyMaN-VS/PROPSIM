/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['recharts', 'react-smooth'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig

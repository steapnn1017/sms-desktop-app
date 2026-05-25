/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Disable server-side features for Electron static export
  experimental: {
    // Required for static export with app router
  },
  // Asset prefix for Electron file protocol
  assetPrefix: process.env.NODE_ENV === 'production' ? '.' : '',
}

export default nextConfig

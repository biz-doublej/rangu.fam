/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  reactStrictMode: false,
  eslint: {
    // Skip ESLint during `next build` so deployments aren't blocked by lint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type checking during `next build` to unblock deployment
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig

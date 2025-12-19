const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: isProd ? '/CycleTime-Logic' : '',
  assetPrefix: isProd ? '/CycleTime-Logic/' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    // The static export pipeline runs without linting support in CI, so skip lint during builds.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

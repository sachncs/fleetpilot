/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 16 enables Turbopack by default. The webpack config below
  // is kept for `next build --webpack`/older tooling. The serverComponents
  // externalisation lets Leaflet skip its Node-only UMD wrappers during
  // the client bundle.
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      worker_threads: false,
    };
    return config;
  },
};

export default nextConfig;

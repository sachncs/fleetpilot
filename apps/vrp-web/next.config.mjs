/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      worker_threads: false,
    };

    // The vehicle-routing browser worker bundle uses `import.meta.url`.
    // Mark the worker output as an ES module so Terser preserves it.
    if (!isServer) {
      config.module.rules.push({
        test: /worker\.browser\.js$/,
        type: 'javascript/esm',
      });
    }

    return config;
  },
};

export default nextConfig;

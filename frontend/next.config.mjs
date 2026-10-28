/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  serverExternalPackages: ['better-sqlite3', 'ws', 'fleetpilot'],
};

export default nextConfig;

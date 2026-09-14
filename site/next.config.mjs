const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'fleetpilot';
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const basePath = isGithubActions ? `/${repoName}` : '';

// Expose basePath to client/server code via env so layout/metadata
// can prefix static asset URLs (favicon, manifest, og) correctly.
process.env.NEXT_PUBLIC_BASE_PATH = basePath;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
};

export default nextConfig;
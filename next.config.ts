import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This project sits inside a larger repository that has its own lockfile.
  // Without pinning the root, Turbopack picks the outer one and resolves
  // modules from the wrong tree.
  turbopack: { root: __dirname },
  // The dev badge sits in the corner of every captured frame.
  devIndicators: false,
  // three ships untranspiled ESM that Next handles fine, but keeping the
  // experience out of the server bundle avoids pulling a renderer into a
  // request path that will never use one.
  serverExternalPackages: [],
  experimental: {
    optimizePackageImports: ['three', '@react-three/drei'],
  },
};

export default nextConfig;

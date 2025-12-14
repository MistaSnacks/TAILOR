import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Required for @react-pdf/renderer to work in server environments (Next.js 16+)
  serverExternalPackages: ['@react-pdf/renderer'],

  // Turbopack configuration for react-pdf compatibility (Next.js 16+)
  turbopack: {
    resolveAlias: {
      // Fix for canvas dependency issues in react-pdf
      canvas: path.resolve(__dirname, 'empty-module.ts'),
    },
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;

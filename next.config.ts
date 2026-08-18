import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // transformers.js ships optional native helpers for its Node path. We only ever
  // run it in the browser, so keep them out of the client bundle entirely.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      sharp: { browser: "./src/lib/empty.ts" },
      "onnxruntime-node": { browser: "./src/lib/empty.ts" },
    },
  },
};

export default nextConfig;

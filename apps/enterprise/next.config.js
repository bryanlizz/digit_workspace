import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ["@lobster/types"],
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};

export default config;

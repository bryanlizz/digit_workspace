/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { fileURLToPath } from "url";
import path from "path";

import "./src/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const monorepoRoot = path.join(__dirname, "../../");

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingExcludes: {
    "*": ["C:\\Users\\**\\Application Data\\**"],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
  transpilePackages: ["@lobster/types", "@lobster/db"],

  /** @see https://github.com/vercel/next.js/issues/41980 */
  i18n: {
    locales: ["zh-CN"],
    defaultLocale: "zh-CN",
  },

  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};

export default config;

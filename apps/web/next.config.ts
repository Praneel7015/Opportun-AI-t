import type { NextConfig } from "next";

/**
 * Amplify Hosting (especially monorepo SSR) may not inject console env vars into
 * the compute runtime. Values are baked into `.env.production` during `amplify.yml`
 * preBuild, then exposed here so server code can read them after `next build`.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@opportun-ai-t/core"],
  env: {
    DEMO_MODE: process.env.DEMO_MODE ?? "",
    TABLE_NAME: process.env.TABLE_NAME ?? "",
    APP_REGION: process.env.APP_REGION ?? "",
    SCHEDULE_TIMEZONE: process.env.SCHEDULE_TIMEZONE ?? "",
    SCHEDULE_EXPRESSION: process.env.SCHEDULE_EXPRESSION ?? "",
    ANALYSIS_CAP: process.env.ANALYSIS_CAP ?? "",
  },
};

export default nextConfig;

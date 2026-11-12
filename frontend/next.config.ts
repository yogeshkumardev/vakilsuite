import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const backendUrl = process.env.NEXT_BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  /* config options here */
  // The USB-connected Android WebView reaches the dev server through adb reverse.
  // Keep this allowlist limited to the local loopback host used by that editor POC.
  allowedDevOrigins: ["127.0.0.1"],
  // Proxy /api/v1 calls to FastAPI in dev — avoids CORS in development
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
  reactCompiler: true,
  transpilePackages: ["@casualoffice/docs", "@eigenpal/docx-core"],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: "vakilsuite",
  project: "frontend",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});

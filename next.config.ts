import type { NextConfig } from "next";

/**
 * The Laravel API serves product imagery from its public storage disk, so the
 * host has to be allowed explicitly before next/image will optimise it.
 */
const apiUrl = new URL(process.env.API_URL ?? "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  // Partial Prerendering. Each route gets a prerendered static shell, with
  // request-time data streamed into Suspense holes. Without this, reading the
  // cart cookie in the header would opt every route into dynamic rendering.
  cacheComponents: true,

  images: {
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        port: apiUrl.port || undefined,
        pathname: "/storage/**",
      },
    ],

    // Next 16 blocks optimising images served from a local IP by default, as
    // an SSRF precaution. In development the API is on 127.0.0.1, so without
    // this every product image comes back 400. Development only — a deployed
    // storefront must point at a real host instead of re-enabling this.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;

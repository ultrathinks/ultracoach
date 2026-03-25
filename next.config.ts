import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self)" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  pageExtensions: ["ts", "tsx", "mdx"],
  reactCompiler: true,
  serverExternalPackages: ["postgres"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);

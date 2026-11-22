import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/beranda",
        permanent: true,
      },
      {
        source: "/verify-email",
        destination: "/beranda",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

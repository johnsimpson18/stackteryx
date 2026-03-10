import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  async redirects() {
    return [
      {
        source: "/bundles",
        destination: "/services",
        permanent: true,
      },
      {
        source: "/bundles/new",
        destination: "/services/new",
        permanent: true,
      },
      {
        source: "/bundles/:id",
        destination: "/services/:id",
        permanent: true,
      },
      {
        source: "/recommend",
        destination: "/sales-studio",
        permanent: true,
      },
      {
        source: "/tools",
        destination: "/stack-catalog",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

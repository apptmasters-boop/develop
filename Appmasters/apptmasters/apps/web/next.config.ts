import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@apptmasters/ui", "@apptmasters/types", "@apptmasters/utils"],
  images: {
    domains: ["apptmasters-uploads.s3.amazonaws.com"],
  },
};

export default nextConfig;

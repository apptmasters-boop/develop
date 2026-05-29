/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@apptmasters/ui",
    "@apptmasters/types",
    "@apptmasters/utils",
    "@apptmasters/api-client",
  ],
  images: {
    domains: ["apptmasters-uploads.s3.amazonaws.com"],
  },
};

export default nextConfig;

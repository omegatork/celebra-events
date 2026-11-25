/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true
  },
  experimental: {
    // Keep the Postgres driver as a regular Node dependency (not bundled).
    serverComponentsExternalPackages: ["pg"]
  }
};

export default nextConfig;

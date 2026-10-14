import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Uploaded product, category and banner pictures are served by Cloudinary
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;

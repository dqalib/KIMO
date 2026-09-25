import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets the iPad load the dev server over home Wi-Fi
  // (http://<PC's Wi-Fi IP>:3000). Update if the PC's IP changes.
  allowedDevOrigins: ["192.168.1.128"],
};

export default nextConfig;

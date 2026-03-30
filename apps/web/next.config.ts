import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    output: "standalone",
    transpilePackages: ["@inspecto/shared"],
    serverExternalPackages: ["@iconify/json"],
    turbopack: {},
}

export default nextConfig

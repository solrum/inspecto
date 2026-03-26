import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    output: "standalone",
    transpilePackages: ["@inspecto/shared"],
    turbopack: {},
}

export default nextConfig

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // output: "standalone" 제거 — standalone 전용 nft 트레이스가 세그폴트(googleapis 등 대형 의존성).
  // 대신 Dockerfile 러너가 prod node_modules + `next start` 로 구동.
  generateBuildId: async () => `build-${Date.now()}`,
  serverExternalPackages: ["node-cron", "googleapis"],
  async rewrites() {
    return [
      {
        source: '/gate/:path*',
        destination: 'https://orulzi-gate.fly.dev/:path*',
      },
    ]
  },
  images: {
    remotePatterns: [],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    // Supabase의 SES lockdown이 React 런타임 Function 생성자를 제거하는 문제 방지
    config.resolve.alias = {
      ...config.resolve.alias,
      "ses": false,
    }
    // node-cron은 Node.js 전용 — 클라이언트 번들에서 제외
    if (!isServer) {
      config.resolve.alias["node-cron"] = false
    }
    return config
  },
}

export default nextConfig

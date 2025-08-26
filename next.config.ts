// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // images 설정을 추가합니다.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn-lostark.game.onstove.com',
        pathname: '/**',
      },
      // 필요시 추가 예시
      // { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
    ],
  },

  // ... 기타 설정들 (output, webpack 등)
};

export default nextConfig;
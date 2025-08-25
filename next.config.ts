// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // (기존 devIndicators 설정이 있다면 그대로 둡니다)
  devIndicators: {
    buildActivity: false,
  },

  // images 설정을 추가합니다.
  images: {
    domains: [
      'cdn-lostark.game.onstove.com', // 로스트아크 이미지 CDN 도메인
      // 'img.youtube.com', // 만약 유튜브 썸네일 등을 사용할 경우 추가 (예시)
      // 'another.example.com', // 다른 이미지 호스팅 도메인이 있다면 여기에 추가
    ],
  },

  // ... 기타 설정들 (output, webpack 등)
};

export default nextConfig;
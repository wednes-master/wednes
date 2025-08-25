// src/app/layout.tsx
import './globals.css'; // 전역 스타일시트 임포트 (tailwind css 포함)
import type { Metadata } from 'next';
import Header from '@/components/Header'; // 새로 생성할 Header 컴포넌트 임포트
import Footer from '@/components/Footer'; // 새로 생성할 Footer 컴포넌트 임포트

// 배포 도메인으로 교체하세요 (예: https://wednes.dev)
const baseUrl = 'https://your-domain.example';
const ogImagePath = '/og/wednes-symbol.png'; // /public/og/wednes-symbol.png

export const metadata: Metadata = {
  title: 'wednes',
  description: '로스트아크 다양한 정보 제공',
  metadataBase: new URL(baseUrl),
  openGraph: {
    type: 'website',
    url: '/',
    title: 'wednes',
    siteName: 'wednes',
    description: '로스트아크 다양한 정보 제공',
    images: [
      {
        url: ogImagePath, // 절대 URL로 변환됨 (metadataBase 기준)
        width: 1200,
        height: 630,
        alt: 'wednes symbol',
      },
    ],
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'wednes',
    description: '로스트아크 다양한 정보 제공',
    images: [ogImagePath],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="background-color">
      {/* 새로운 색상 팔레트 적용: 배경색 bg-zinc-950, 기본 텍스트색 text-zinc-100 */}
      <body className="flex flex-col min-h-screen background-color">
        <Header /> {/* Header 컴포넌트 렌더링 */}
        
        <main className="flex-grow container mx-auto">
          {children} {/* 여기에 각 페이지의 콘텐츠가 렌더링됩니다 */}
        </main>

        <Footer /> {/* Footer 컴포넌트 렌더링 */}
      </body>
    </html>
  );
}
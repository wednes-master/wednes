// src/components/cards/EventsCard.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { LostarkEvent } from '@/types/lostark';

type Props = {
  events: LostarkEvent[];
};

export default function EventsCard({ events }: Props) {
  if (!Array.isArray(events) || events.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="bg-zinc-800/50 rounded-lg p-6">
          <div className="text-zinc-400 text-lg mb-2">🎉</div>
          <p className="text-text-secondary">표시할 이벤트가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
        {events.map((event, idx) => {
          const link = typeof event.Link === 'string' ? event.Link : undefined;
          const thumbnailUrl = event.Thumbnail;
          
          if (!thumbnailUrl) return null;

          const content = (
            <div className="group relative bg-zinc-800/30 rounded-xl p-2 border border-zinc-600/30 hover:border-zinc-500/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={thumbnailUrl}
                  alt="이벤트 이미지"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                  priority={idx < 3}
                />
              </div>
            </div>
          );

          return (
            <div key={idx} className="w-full">
              {link ? (
                <Link href={link} target="_blank" rel="noopener noreferrer">
                  {content}
                </Link>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>
      
      {/* 하단 페이드 효과 - 슬라이드임을 알려주는 그라데이션 */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-900 via-zinc-900/90 to-transparent pointer-events-none rounded-b-lg" />
      
      {/* 추가적인 시각적 힌트 - 작은 화살표 아이콘 */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-none">
        <div className="w-6 h-6 bg-zinc-800/80 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>
  );
}
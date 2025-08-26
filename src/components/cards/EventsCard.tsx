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
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-900/60 via-zinc-900/30 to-transparent pointer-events-none rounded-b-lg" />
    </div>
  );
}
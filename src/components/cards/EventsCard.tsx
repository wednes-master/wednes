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
    return <p className="text-text-secondary">표시할 이벤트가 없습니다.</p>;
  }

  return (
    // 모바일 1열, md부터 2열로 확장
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
      {events.map((item, idx) => {
        const link = typeof item.Link === 'string' ? item.Link : undefined;
        const thumbnailUrl = item.Thumbnail;
        if (!thumbnailUrl) return null;

        // 셀은 padding 없이 꽉 채우기
        const content = (
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-md">
            <Image
              src={thumbnailUrl}
              alt="이벤트 이미지"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              priority={idx < 3}
            />
          </div>
        );

        return (
          <div
            key={idx}
            className="w-full"
          >
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
  );
}
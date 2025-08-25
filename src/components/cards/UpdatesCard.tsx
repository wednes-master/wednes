// src/components/cards/UpdatesCard.tsx
'use client';

import Link from 'next/link';
import type { LostarkEvent } from '@/types/lostark';

type Props = {
  // 실제로는 LostarkUpdate[] 같은 타입을 사용하시길 권장합니다.
  events: LostarkEvent[];
};

export default function UpdatesCard({ events }: Props) {
  if (!Array.isArray(events) || events.length === 0) {
    return <p className="text-text-secondary">업데이트 소식이 없습니다.</p>;
  }

  return (
    <ul className="space-y-3">
      {events.map((item, idx) => {
        const title = item.Title || '업데이트';
        const link = typeof item.Link === 'string' ? item.Link : undefined;

        // 날짜가 필요하면 아래 로직을 사용하세요.
        const displayDate = item.StartDate
          ? new Date(item.StartDate).toLocaleDateString('ko-KR')
          : '';

        return (
          <li key={idx} className="flex flex-col">
            {link ? (
              <Link
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-primary hover:underline transition duration-200"
              >
                {title}
              </Link>
            ) : (
              <span className="cursor-default">{title}</span>
            )}
            {displayDate && (
              <span className="text-xs text-text-secondary mt-1">{displayDate}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
// src/components/cards/NoticesCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { LostarkNotice } from '@/types/lostark';

type Props = {
  notices: LostarkNotice[];
};

export default function NoticesCard({ notices }: Props) {
  if (!Array.isArray(notices) || notices.length === 0) {
    return <p className="text-text-secondary">정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>;
  }

  return (
    <ul className="text-text-primary space-y-2 list-none">
      {notices.map((item, index) => {
        const title = item.Title ?? '제목 없음';
        const link = typeof item.Link === 'string' ? item.Link : undefined;
        const thumbnailUrl = item.Thumbnail || undefined;
        // 공지 타입은 Date만 표기
        const displayDate =
        typeof item.Date === 'string'
          ? new Date(item.Date).toLocaleDateString('ko-KR')
          : '';

      return (
        <li key={index} className="flex items-start">
          {thumbnailUrl && (
            <div className="flex-shrink-0 mr-3 hidden xs:block">
              <Image
                src={thumbnailUrl}
                alt={title}
                width={96}
                height={60}
                className="rounded-md object-cover"
              />
            </div>
          )}

          <div className="flex-grow min-w-0 flex flex-col justify-center">
            {link ? (
              <Link
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate leading-5 hover:text-brand-primary hover:underline transition duration-200"
                title={title}
              >
                {title}
              </Link>
            ) : (
              <span className="block truncate leading-5 cursor-default" title={title}>
                {title}
              </span>
            )}

            {displayDate && (
              <span
                className="block text-xs text-text-secondary mt-1 truncate leading-4"
                title={displayDate}
              >
                {displayDate}
              </span>
            )}
          </div>
        </li>
      );
    })}
    </ul>
  );
}
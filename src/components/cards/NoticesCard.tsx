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
        const thumbnailUrl = item.Thumbnail;
        let displayDate = '';

        // item.StartDate와 item.EndDate가 LostarkNotice 타입에 없으므로, 안전하게 접근하도록 수정
        const maybeStartDate = (item as any).StartDate;
        const maybeEndDate = (item as any).EndDate;

        if (typeof maybeStartDate === 'string') {
          const startDate = new Date(maybeStartDate).toLocaleDateString('ko-KR');
          if (typeof maybeEndDate === 'string' && maybeEndDate !== null) {
            const endDate = new Date(maybeEndDate).toLocaleDateString('ko-KR');
            displayDate = `${startDate} ~ ${endDate}`;
          } else {
            displayDate = startDate;
          }
        } else if (typeof item.Date === 'string') {
          displayDate = new Date(item.Date).toLocaleDateString('ko-KR');
        }

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
             {/* 말줄임 안정화를 위한 min-w-0 */}
            <div className="flex-grow min-w-0 flex flex-col justify-center">
              {/* 제목: 한 줄 말줄임 */}
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
                <span
                  className="block truncate leading-5 cursor-default"
                  title={title}
                >
                  {title}
                </span>
              )}

              {/* 날짜: 한 줄 말줄임 */}
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
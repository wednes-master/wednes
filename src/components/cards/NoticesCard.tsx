// src/components/cards/NoticesCard.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { LostarkNotice } from '@/types/lostark';

type Props = {
  notices: LostarkNotice[];
};

export default function NoticesCard({ notices }: Props) {
  if (!Array.isArray(notices) || notices.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="bg-zinc-800/50 rounded-lg p-6">
          <div className="text-zinc-400 text-lg mb-2">📢</div>
          <p className="text-text-secondary">표시할 공지사항이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
        {notices.map((notice, idx) => {
        const link = typeof notice.Link === 'string' ? notice.Link : undefined;
        const thumbnailUrl = notice.Thumbnail;

        const content = (
          <div className="group relative bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl p-4 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
            {/* 배경 그라데이션 효과 */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10 flex gap-4">
              {/* 썸네일 이미지 */}
              {thumbnailUrl && (
                <div className="flex-shrink-0">
                  <div className="relative w-20 h-12 overflow-hidden rounded-lg border border-zinc-600/30 group-hover:border-zinc-500/50 transition-colors duration-300">
                    <Image
                      src={thumbnailUrl}
                      alt="공지사항 썸네일"
                      fill
                      sizes="80px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      priority={idx < 3}
                    />
                  </div>
                </div>
              )}
              
              {/* 텍스트 내용 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-medium text-text-main line-clamp-2 group-hover:text-blue-400 transition-colors duration-200 mb-2">
                  {notice.Title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-explan">
                    {new Date(notice.Date).toLocaleDateString('ko-KR')}
                  </span>
                  {/* 작은 원형 장식 요소 */}
                  <div className="w-2 h-2 bg-blue-500/60 rounded-full group-hover:bg-blue-400 transition-colors duration-200" />
                </div>
              </div>
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
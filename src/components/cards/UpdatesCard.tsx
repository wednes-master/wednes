// src/components/cards/UpdatesCard.tsx
'use client';

import Link from 'next/link';
import type { LostarkEvent } from '@/types/lostark';

type Props = {
  events: LostarkEvent[];
};

export default function UpdatesCard({ events }: Props) {
  if (!Array.isArray(events) || events.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="bg-zinc-800/50 rounded-lg p-6">
          <div className="text-zinc-400 text-lg mb-2">🔄</div>
          <p className="text-text-secondary">표시할 업데이트가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
      {events.map((event, idx) => {
        const link = typeof event.Link === 'string' ? event.Link : undefined;

        const content = (
          <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20 hover:border-green-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-1">
            {/* 배경 그라데이션 효과 */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-medium text-text-main line-clamp-2 group-hover:text-green-400 transition-colors duration-200 mb-2">
                  {event.Title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-explan">
                    {new Date(event.StartDate).toLocaleDateString('ko-KR')}
                  </span>
                  {/* 작은 원형 장식 요소 */}
                  <div className="w-2 h-2 bg-green-500/60 rounded-full group-hover:bg-green-400 transition-colors duration-200" />
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
  );
}
// src/app/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/Card';
import GameContentCalendar from '@/components/GameContentCalendar';

import {
  getLostarkNotices,
  getLostarkEvents,
  getLostarkAlarms,
  getLostarkGameCalendar,
} from '@/app/lib/api';

import type {
  LostarkNotice,
  LostarkEvent,
  LostarkAlarmItem,
  LostarkGameContent,
} from '@/types/lostark';

import NoticesCard from '@/components/cards/NoticesCard';
import EventsCard from '@/components/cards/EventsCard';
import UpdatesCard from '@/components/cards/UpdatesCard';

export default async function HomePage() {
  let notices: LostarkNotice[] = [];
  let events: LostarkEvent[] = [];
  let calendar: LostarkGameContent[] = [];

  try {
    [notices, events, calendar] = await Promise.all([
      getLostarkNotices(5), // 10개
      getLostarkEvents(6),  // 10개
      getLostarkGameCalendar(),
    ]);
  } catch (error) {
    console.error('Failed to fetch all data:', error);
    notices = [];
    events = [];
    calendar = [];
  }

  return (
    <section className="relative max-w-[1216px] mx-auto px-3 sm:px-4">
      {/* 상단 배너 */}
      <div className="w-full relative mt-3 rounded-xl overflow-hidden h-[140px] sm:h-[200px]">
        <Image
          src="/summer.png"
          alt="상단 배너"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* 좌/우 광고 (유지) */}
      <aside className="hidden lg:flex fixed left-20 top-1/2 -translate-y-1/2 w-[200px] h-[600px] bg-gray-400 items-center justify-center rounded-md shadow-md">
        광고 200x600
      </aside>
      <aside className="hidden lg:flex fixed right-20 top-1/2 -translate-y-1/2 w-[200px] h-[600px] bg-gray-400 items-center justify-center rounded-md shadow-md">
        광고 200x600
      </aside>

      <div className="max-w-[1216px] mx-auto flex flex-col gap-3">
        {/* 게임 캘린더 */}
        <GameContentCalendar calendar={calendar} />

        {/* 공지 · 이벤트(이미지만) · 업데이트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 공지사항 */}
          <Card className="text-left">
            <h3 className="text-xl font-semibold mb-4 text-brand-primary">
              <Link
                href="https://lostark.game.onstove.com/News/Notice/List"
                target="_blank"
                rel="noopener noreferrer"
              >
                공지사항
              </Link>
            </h3>
            <div className="max-h-[360px] overflow-y-auto pr-2 text-explan-color">
              <NoticesCard notices={notices} />
            </div>
          </Card>

          {/* 이벤트(이미지 그리드만, 스크롤바 숨김 + 페이드) */}
          <Card className="text-left">
            <div className="relative max-h-[360px] overflow-y-auto pr-2 scroll-invisible has-fade-overlay">
              <EventsCard events={events} />
            </div>
          </Card>

          {/* 업데이트 */}
          <Card className="text-left">
            <h3 className="text-xl font-semibold mb-4 text-brand-primary">
              <Link
                href="https://lostark.game.onstove.com/News/Update/List"
                target="_blank"
                rel="noopener noreferrer"
              >
                업데이트
              </Link>
            </h3>
            <div className="max-h-[360px] overflow-y-auto pr-2 text-explan-color">
              <UpdatesCard events={events} />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
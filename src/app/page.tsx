// src/app/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/Card';
import GameContentCalendar from '@/components/GameContentCalendar';

import {
  getNoticesFromDB,
  getEventsFromDB,
  getGameContentsFromDB,
  clearGameContentsCache,
} from '@/app/lib/api';

import type {
  LostarkNotice,
  LostarkEvent,
  LostarkGameContent,
} from '@/types/lostark';

import NoticesCard from '@/components/cards/NoticesCard';
import EventsCard from '@/components/cards/EventsCard';
import UpdatesCard from '@/components/cards/UpdatesCard';

// 스켈레톤 로딩 컴포넌트
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-300 rounded mb-2"></div>
      <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded mb-2 w-1/2"></div>
    </div>
  );
}

export default async function HomePage() {
  let notices: LostarkNotice[] = [];
  let events: LostarkEvent[] = [];
  let calendar: LostarkGameContent[] = [];

  try {
    console.log('🔄 메인 페이지: DB 데이터 조회 시작...');
    
    // 캐시 강제 초기화 (디버깅용)
    clearGameContentsCache();
    
    const startTime = Date.now();
    
    // 병렬로 실행하되 타임아웃 설정
    const timeout = 10000; // 10초로 늘림
    
    const [noticesResult, eventsResult, calendarResult] = await Promise.all([
      Promise.race([
        getNoticesFromDB(5),
        new Promise<LostarkNotice[]>((_, reject) => setTimeout(() => reject(new Error('공지사항 조회 타임아웃')), timeout))
      ]).catch(() => [] as LostarkNotice[]),
      Promise.race([
        getEventsFromDB(10),
        new Promise<LostarkEvent[]>((_, reject) => setTimeout(() => reject(new Error('이벤트 조회 타임아웃')), timeout))
      ]).catch(() => [] as LostarkEvent[]),
      Promise.race([
        getGameContentsFromDB(),
        new Promise<LostarkGameContent[]>((_, reject) => setTimeout(() => reject(new Error('게임콘텐츠 조회 타임아웃')), timeout))
      ]).catch(() => [] as LostarkGameContent[])
    ]);
    
    notices = noticesResult;
    events = eventsResult;
    calendar = calendarResult;
    
    const endTime = Date.now();
    console.log('✅ 메인 페이지: DB 데이터 조회 완료');
    console.log('⏱️ 소요시간:', endTime - startTime, 'ms');
    console.log('📦 공지사항 개수:', notices.length);
    console.log('📦 이벤트 개수:', events.length);
    console.log('📦 게임콘텐츠 개수:', calendar.length);
    
  } catch (error) {
    console.error('❌ 메인 페이지: DB 데이터 조회 실패:', error);
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
            <h3 className="text-lg font-semibold mb-4 text-brand-primary">
              <Link
                href="https://lostark.game.onstove.com/News/Notice/List"
                target="_blank"
                rel="noopener noreferrer"
              >
                공지사항
              </Link>
            </h3>
            <div className="max-h-[360px] overflow-y-auto pr-2 text-explan-color">
              {notices.length > 0 ? (
                <NoticesCard notices={notices} />
              ) : (
                <LoadingSkeleton />
              )}
            </div>
          </Card>

          {/* 이벤트(이미지 그리드만, 스크롤바 숨김 + 페이드) */}
          <Card className="text-left">
            <div className="relative max-h-[360px] overflow-y-auto pr-2 scroll-invisible has-fade-overlay">
              {events.length > 0 ? (
                <EventsCard events={events} />
              ) : (
                <LoadingSkeleton />
              )}
            </div>
          </Card>

          {/* 업데이트 */}
          <Card className="text-left">
            <h3 className="text-lg font-semibold mb-4 text-brand-primary">
              <Link
                href="https://lostark.game.onstove.com/News/Update/List"
                target="_blank"
                rel="noopener noreferrer"
              >
                업데이트
              </Link>
            </h3>
            <div className="max-h-[360px] overflow-y-auto pr-2 text-explan-color">
              {events.length > 0 ? (
                <UpdatesCard events={events} />
              ) : (
                <LoadingSkeleton />
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
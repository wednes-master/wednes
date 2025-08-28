// src/components/GameContentCalendar.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Card from './Card';
import type { LostarkGameContent, GameContentRewardItem } from '@/types/lostark';
import GameTimers from '@/components/GameTimers';

interface Props {
  calendar: LostarkGameContent[];
}

const nextAdventureTimeGetter = () => {
  // 규칙
  // - 평일(월~금): 11:00, 13:00, 19:00, 21:00, 23:00
  // - 주말(토, 일): 09:00, 11:00, 13:00, 19:00, 21:00, 23:00
  const now = new Date();
  const day = now.getDay(); // 0:일, 6:토
  const isWeekend = day === 0 || day === 6;
  const weekdayHours = [11, 13, 19, 21, 23];
  const weekendHours = [9, 11, 13, 19, 21, 23];
  const schedule = isWeekend ? weekendHours : weekdayHours;

  const todayCandidates = schedule
    .map((h) => {
      const d = new Date(now);
      d.setHours(h, 0, 0, 0);
      return d;
    })
    .filter((d) => d.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  if (todayCandidates.length > 0) return todayCandidates[0];

  // 오늘 이후가 없으면 내일 첫 스폰 시간
  const nextDay = new Date(now);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayIsWeekend = nextDay.getDay() === 0 || nextDay.getDay() === 6;
  const nextSchedule = nextDayIsWeekend ? weekendHours : weekdayHours;
  nextDay.setHours(nextSchedule[0], 0, 0, 0);
  return nextDay;
};

// 카오스게이트 다음 등장 시각 계산기
const nextChaosGateTimeGetter = () => {
  // 카오스게이트 출현 요일: 월(1), 목(4), 토(6), 일(0)
  const CHAOS_GATE_DAYS = new Set<number>([0, 1, 4, 6]);
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  
  // 현재 시간이 카오스게이트 활성 시간대인지 확인
  const isChaosGateActive = () => {
    // 오늘이 출현일이고 11시 이후인 경우
    if (CHAOS_GATE_DAYS.has(currentDay) && currentHour >= 11) {
      return true;
    }
    
    // 전날이 출현일이었고 현재 5시 이전인 경우
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDay = yesterday.getDay();
    if (CHAOS_GATE_DAYS.has(yesterdayDay) && currentHour < 5) {
      return true;
    }
    
    return false;
  };
  
  // 현재 활성 시간대라면 다음 정시 반환
  if (isChaosGateActive()) {
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    if (nextHour.getTime() <= now.getTime()) {
      nextHour.setHours(nextHour.getHours() + 1);
    }
    return nextHour;
  }
  
  // 활성 시간대가 아니면 미출현
  // 주석을 해제하면 다음 출현 시간을 표시할 수 있습니다
  /*
  // 다음 출현일 찾기
  let daysToAdd = 1;
  while (daysToAdd <= 7) {
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysToAdd);
    const nextDay = nextDate.getDay();
    
    if (CHAOS_GATE_DAYS.has(nextDay)) {
      // 다음 출현일 오전 11시
      nextDate.setHours(11, 0, 0, 0);
      return nextDate;
    }
    
    daysToAdd++;
  }
  */
  
  return null;
};

export default function GameContentCalendar({ calendar }: Props) {
  const [selectedDay] = useState(new Date().getDay());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 현재 주의 모든 날짜 (Date 객체) 계산
  const weeklyDates: Date[] = [];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weeklyDates.push(day);
  }

  // 모험섬 카테고리만 필터링
  const adventureContents = calendar.filter(
    (item) =>
      item.CategoryName === '모험 섬' &&
      item.StartTimes.some(() => true)
  );

  // 디버깅을 위한 로그 추가
  console.log('🔍 현재 요일:', selectedDay);
  console.log('🔍 모험섬 데이터:', adventureContents);
  
  // 오늘 날짜의 모험섬 콘텐츠만 필터링 (한국 시간 기준)
  const currentDate = new Date();
  // 한국 시간대로 설정 (UTC+9)
  const koreaTime = new Date(currentDate.getTime() + (9 * 60 * 60 * 1000));
  const todayStart = new Date(koreaTime);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  
  const dayContents = adventureContents.filter((content) => {
    const hasTodayTime = content.StartTimes.some((time) => {
      const eventDate = new Date(time);
      const isToday = eventDate >= todayStart && eventDate <= todayEnd;
      console.log(`📅 ${content.ContentsName}: ${time} -> ${isToday ? '오늘' : '다른날'} (한국 오늘: ${todayStart.toISOString()} ~ ${todayEnd.toISOString()})`);
      return isToday;
    });
    return hasTodayTime;
  })
  .filter((content, index, self) => 
    // 중복 제거: 같은 이름의 모험섬은 첫 번째만 유지
    index === self.findIndex(c => c.ContentsName === content.ContentsName)
  )
  .sort((a, b) => a.ContentsName.localeCompare(b.ContentsName)); // 이름 순으로 정렬
  
  console.log('✅ 필터링된 모험섬:', dayContents);

  const getAllRewardItems = (rewards: LostarkGameContent['RewardItems']): GameContentRewardItem[] => {
    if (!rewards) return [];
    return rewards.flatMap(itemLevelGroup => itemLevelGroup.Items);
  };

  return (
    <Card className="mt-3 text-left">
      {/* ★★★ 최상단 시간 표시 영역 (모험섬 + 카오스게이트) ★★★ */}
      <div className="text-center mb-4">
        <div className="flex justify-center items-center gap-8">
        <GameTimers 
          nextAdventureTimeGetter={nextAdventureTimeGetter}
          nextChaosGateTimeGetter={nextChaosGateTimeGetter}
        />
        </div>
      </div>
      {/* ★★★ 최상단 시간 표시 영역 끝 ★★★ */}

      {/* 선택된 요일의 콘텐츠 표시 영역 */}
      {dayContents.length === 0 ? (
        <div className="text-center py-8">
          <div className="bg-zinc-800/50 rounded-lg p-6">
            <div className="text-zinc-400 text-lg mb-2">🏝️</div>
            <p className="text-text-secondary">오늘 진행되는 모험섬 콘텐츠가 없습니다.</p>
            <p className="text-zinc-500 text-sm mt-2">내일의 모험섬을 확인해보세요.</p>
          </div>
        </div>
      ) : (
        // 모험섬: 모바일에서는 1열, PC에서는 3열로 표시
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {dayContents.map((content, idx) => {
            const allRewards = getAllRewardItems(content.RewardItems);

            return (
              <div
                key={idx}
                className="group relative bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 rounded-xl p-3 sm:p-4 lg:p-6 border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-zinc-900/20 hover:-translate-y-1"
              >
                {/* 배경 그라데이션 효과 */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10">
                  {/* 상단: 섬 이름과 아이콘 */}
                  <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
                    <div className="relative">
                      <Image
                        src={content.ContentsIcon}
                        alt={content.ContentsName}
                        width={40}
                        height={40}
                        className="sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl object-cover border-2 border-zinc-600 group-hover:border-zinc-500 transition-colors duration-300 shadow-lg"
                      />
                      {/* 아이콘 위에 작은 장식 효과 */}
                      <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-text-primary font-bold text-sm sm:text-base lg:text-lg group-hover:text-white transition-colors duration-300 truncate">
                        {content.ContentsName}
                      </h4>
                      <div className="flex items-center gap-1 sm:gap-2 mt-1">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full" />
                        <span className="text-zinc-400 text-xs sm:text-sm">모험섬</span>
                      </div>
                    </div>
                  </div>

                  {/* 하단: 보상 아이템들 */}
                  {allRewards.length > 0 && (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">💰</span>
                        </div>
                        <span className="text-zinc-300 text-xs sm:text-sm font-medium">보상 아이템</span>
                      </div>
                      
                      <div className="bg-zinc-900/50 rounded-lg p-2 sm:p-3 border border-zinc-700/30">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {allRewards.map((reward, rewardIdx) => (
                            <div
                              key={rewardIdx}
                              className="group/reward relative bg-zinc-800/80 rounded-md sm:rounded-lg p-1.5 sm:p-2 border border-zinc-600/30 hover:border-zinc-500/50 transition-all duration-200 hover:scale-105"
                            >
                              <Image
                                src={reward.Icon}
                                alt={reward.Name}
                                width={18}
                                height={18}
                                className="sm:w-6 sm:h-6 lg:w-6 lg:h-6 object-contain"
                              />
                              {/* 툴팁 효과 */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded opacity-0 group-hover/reward:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                                {reward.Name}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 우상단 장식 요소 */}
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
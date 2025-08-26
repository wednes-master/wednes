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

  // 선택된 요일에 해당하는 모험섬 콘텐츠만 필터링
  const dayContents = adventureContents.filter((content) =>
    content.StartTimes.some( 
      (time) => new Date(time).getDay() === selectedDay
    )
  );

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
        <p className="text-text-secondary text-center py-4">해당 요일에 진행되는 모험섬 콘텐츠가 없습니다.</p>
      ) : (
        // 모험섬: 모바일 1열, sm 2열, lg 3열
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 rounded-lg background-box-sub-color">
          {dayContents.map((content, idx) => {
            const allRewards = getAllRewardItems(content.RewardItems);

            return (
              <div
                key={idx}
                className="bg-surface-dark rounded-lg flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-4 p-4"
              >
                {/* 좌측: 이미지 */}
                <Image
                  src={content.ContentsIcon}
                  alt={content.ContentsName}
                  width={64}
                  height={64}
                  className="rounded-full object-cover flex-shrink-0 border-2 border-zinc-700 md:mx-0 mx-auto"
                />

                {/* 우측: 섬 이름, 보상 그룹 */}
                <div className="flex flex-col flex-grow w-full text-center md:text-left">
                  {/* 우측 상단: 섬 이름 */}
                  <h4 className="text-text-primary font-semibold text-sm mt-2 md:mt-0">
                    {content.ContentsName}
                  </h4>

                  {/* 우측 하단: 모든 보상 아이템 */}
                  {allRewards.length > 0 && (
                    <div className="mt-2 w-full">
                      <ul className="list-none p-0 flex flex-wrap gap-2 justify-center md:justify-start">
                        {allRewards.map((reward, rewardIdx) => (
                          <li key={rewardIdx} className="flex items-center">
                            <Image
                              src={reward.Icon}
                              alt={reward.Name}
                              width={20}
                              height={20}
                              className="object-contain flex-shrink-0"
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
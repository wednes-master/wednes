// src/components/GameContentCalendar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Card from './Card';
import type { LostarkGameContent, GameContentRewardItem } from '@/types/lostark';
import GameTimers from '@/components/GameTimers';

interface Props {
  calendar: LostarkGameContent[];
}

const nextAdventureTimeGetter = () => {
  // 여기에 실제 모험섬 일정 계산 로직을 넣으세요.
  // 예시: 매일 20:00에 등장한다고 가정
  const now = new Date();
  const base = new Date(now);
  base.setSeconds(0, 0);
  base.setMinutes(0);
  base.setHours(20);
  if (base <= now) base.setDate(base.getDate() + 1);
  return base;
};

// 카오스게이트 남은시간 계산 함수
function getChaosGateTimeRemaining(): string {
  
  const now = new Date();
  const day = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  
  // 카오스게이트가 열리지 않는 요일 (화, 수, 금)
  if (![0, 1, 4, 6].includes(day)) {
    return '미출현';
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();

  let nextHour: number | null = null;

  // 현재 시간에 따라 다음 카오스게이트 시간 찾기
  if (currentHour < 5) {
    // 새벽 0~4시인 경우, 다음 정시까지
    nextHour = currentHour + 1;
  } else if (currentHour === 5) {
    // 새벽 5시인 경우, 오전 11시까지
    nextHour = 11;
  } else if (currentHour >= 6 && currentHour < 11) {
    // 오전 6~10시인 경우, 오전 11시까지
    nextHour = 11;
  } else if (currentHour >= 11 && currentHour < 23) {
    // 오전 11시~오후 10시인 경우, 다음 정시까지
    nextHour = currentHour + 1;
  } else if (currentHour === 23) {
    // 오후 11시인 경우, 다음날 0시까지
    nextHour = 24; // 24시 = 다음날 0시
  } else {
    return '미출현';
  }

  // 다음 카오스게이트까지 남은 시간 계산
  let hoursLeft = nextHour - currentHour;
  let minutesLeft = 60 - currentMinute;
  let secondsLeft = 60 - currentSecond;

  if (nextHour === 24) {
    hoursLeft = 24 - currentHour;
  }

  // 초가 0이 아니면 분에서 1 빼기
  if (secondsLeft === 60) {
    secondsLeft = 0;
  } else {
    minutesLeft -= 1;
  }

  // 분이 0이 아니면 시간에서 1 빼기
  if (minutesLeft === 60) {
    minutesLeft = 0;
  } else if (minutesLeft > 0) {
    hoursLeft -= 1;
  }

  // 정시 정각인 경우 (분, 초가 모두 0)
  if (currentMinute === 0 && currentSecond === 0) {
    return '진행중';
  }

  return `${hoursLeft.toString().padStart(2, '0')}:${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`;
}

export default function GameContentCalendar({ calendar }: Props) {
  const [selectedDay] = useState(new Date().getDay());
  const [setChaosGateTime] = useState<string>('미출현');

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
        <GameTimers nextAdventureTimeGetter={nextAdventureTimeGetter} />
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
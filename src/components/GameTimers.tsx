'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

// ======================================================
// 공통 유틸
// ======================================================
function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function formatHHMMSSFromMs(diffMs: number) {
  const total = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function toSeoulDate(d = new Date()) {
  // 사용자 시스템 시간대 차이를 회피하고 싶으면 이 함수로 통일
  // Intl을 이용해 "Asia/Seoul" 기준 시각을 구하는 안전한 방식
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  const iso = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+09:00`;
  return new Date(iso);
}

// 정시로 올림
function getNextTopOfHour(base: Date) {
  const d = new Date(base);
  d.setSeconds(0, 0);
  if (d.getMinutes() !== 0) {
    d.setMinutes(0);
    d.setHours(d.getHours() + 1);
  }
  return d;
}

// ======================================================
// 모험섬: HH:MM:SS 포맷 카운트다운
// - nextAppearanceTime을 외부에서 넘기거나, 내부에서 규칙으로 계산하세요.
// - 여기서는 예시로 nextAdventureTimeGetter를 prop으로 받아 유연화.
// ======================================================
type GameTimersProps = {
  // 모험섬 다음 등장 시각(Asia/Seoul 기준) 계산기
  // 반환이 null이면 "오늘 일정 없음" 표기
  nextAdventureTimeGetter?: () => Date | null;

  // 카오스게이트 다음 등장 시각 계산기(선택)
  nextChaosGateTimeGetter?: () => Date | null;

  // 아이콘 경로 커스터마이즈
  adventureIconSrc?: string;
  chaosGateIconSrc?: string;
  fieldBossIconSrc?: string;

  // 시간대를 시스템에 맡길지, 서울로 고정할지
  forceSeoulTime?: boolean;
};

function useTick(intervalMs = 1000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

function now(forceSeoul?: boolean) {
  return forceSeoul ? toSeoulDate() : new Date();
}

// 출현 요일: 일(0), 화(2), 수(3), 금(5)
const FIELD_BOSS_DAYS = new Set<number>([0, 2, 3, 5]); 

function isFieldBossDay(d: Date) {
  return FIELD_BOSS_DAYS.has(d.getDay());
}

// 해당 날짜가 속한 "출현 윈도우"의 시작/종료 시각을 계산
// 규칙: 출현 요일 X의 07:00 ~ (X+1일)의 05:00
function getWindowForDay(base: Date) {
  const start = new Date(base);
  start.setHours(7, 0, 0, 0); // 그날 07:00

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(5, 0, 0, 0); // 다음날 05:00

  return { start, end };
}

// 특정 Date가 어떤 출현 윈도우 내부인지 판정
// 윈도우는 출현 요일의 07:00 ~ 다음날 05:00
// now가 포함되는 윈도우 후보는 최대 2개: (전날이 출현 요일인 경우의 윈도우) 혹은 (오늘이 출현 요일인 경우의 윈도우)
function getActiveWindow(now: Date): { start: Date; end: Date } | null {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 오늘이 출현 요일인 경우의 윈도우
  if (isFieldBossDay(today)) {
    const { start, end } = getWindowForDay(today);
    if (now >= start && now < end) return { start, end };
  }

  // 어제가 출현 요일인 경우의 윈도우
  if (isFieldBossDay(yesterday)) {
    const { start, end } = getWindowForDay(yesterday);
    if (now >= start && now < end) return { start, end };
  }

  return null;
}

// 현재 시간이 필드보스 출현 시간대(07:00 ~ 다음날 05:00)인지 여부
function isWithinFieldBossHours(now: Date) {
  return getActiveWindow(now) !== null;
}

// 다음 스폰 시각(정시)을 찾기
// 1) 지금이 어떤 윈도우 내부면, now 이후의 다음 정시 중 윈도우 내부인 가장 이른 정시
// 2) 윈도우 밖이면, 다음 출현 요일의 윈도우 시작(07:00) 이후의 첫 정시
function getNextFieldBossSpawn(now: Date): Date | null {
  // 1) 현재 활성 윈도우가 있는지 확인
  const active = getActiveWindow(now);
  if (active) {
    // now 이후의 다음 정시
    const candidate = getNextTopOfHour(now);
    if (candidate < active.end) {
      return candidate;
    }
    // 윈도우를 벗어났다면 아래의 2) 로직으로 이어짐
  }

  // 2) 다음 출현 요일의 윈도우 시작 이후 첫 정시 찾기
  // 최대 14일(안전 여유) 순회
  let probe = new Date(now);
  for (let i = 0; i < 24 * 14; i++) {
    const day = new Date(probe);
    day.setHours(0, 0, 0, 0);

    if (isFieldBossDay(day)) {
      const { start, end } = getWindowForDay(day);

      // 윈도우 시작 시각 이후의 첫 정시
      let cand = new Date(start);
      if (now >= cand) {
        cand = getNextTopOfHour(now);
      }
      // cand가 윈도우 내부가 되도록 조정
      if (cand < start) cand = start;
      if (cand >= start && cand < end) return cand;
    }

    // 다음 시간으로 이동해 탐색
    probe = new Date(probe.getTime() + 60 * 60 * 1000);
  }

  return null;
}

// 남은 스폰 횟수: 현재 시점 기준, 활성 윈도우 내에서 앞으로 남은 정시 개수
function countRemainingFieldBossSpawns(now: Date) {
  const active = getActiveWindow(now);
  if (!active) return 0;

  let cand = getNextTopOfHour(now);
  if (cand < active.start) cand = new Date(active.start);
  let count = 0;

  while (cand < active.end) {
    count++;
    cand = new Date(cand.getTime() + 60 * 60 * 1000);
  }

  return count;
}

// ======================================================
// 카오스게이트 기본 로직 (사용되지 않음)
// ======================================================
function defaultChaosGateGetter() {
  // 외부에서 nextChaosGateTimeGetter를 제공하므로 이 함수는 사용되지 않음
  return null;
}

// ======================================================
// 메인 컴포넌트
// ======================================================
export default function GameTimers(props: GameTimersProps) {
  
  const {
    nextAdventureTimeGetter,
    nextChaosGateTimeGetter,
    adventureIconSrc = '/adventure-island-icon.png',
    chaosGateIconSrc = '/chaosgate-icon.png',
    fieldBossIconSrc = '/fieldboss-icon.png',
    forceSeoulTime = true,
  } = props;

  const tick = useTick(1000);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 마운트 전에는 고정된 기준 시각을 사용해 SSR/CSR 불일치 방지
  const n = useMemo(() => (mounted ? now(forceSeoulTime) : new Date(0)), [mounted, forceSeoulTime]);

  // 모험섬
  const adventure = useMemo(() => {
    if (!mounted) return { label: '대기중', color: 'text-gray-500' };
    const next = nextAdventureTimeGetter ? nextAdventureTimeGetter() : null;
    if (!next) {
      return { label: '오늘 일정 없음', color: 'text-gray-500' };
    }
    const diff = next.getTime() - n.getTime();
    if (diff <= 0) {
      return { label: '진행중', color: 'text-green-500' };
    }
    return { label: formatHHMMSSFromMs(diff), color: 'text-yellow-400' };
  }, [mounted, n, nextAdventureTimeGetter]);

  // 카오스게이트
  const chaos = useMemo(() => {
    if (!mounted) return { label: '대기중', color: 'text-gray-500' };
    const getter = nextChaosGateTimeGetter
      ? nextChaosGateTimeGetter
      : () => defaultChaosGateGetter(n);
    const next = getter();
    if (!next) return { label: '미출현', color: 'text-gray-500' };
    const diff = next.getTime() - n.getTime();
    if (diff <= 0) return { label: '진행중', color: 'text-green-500' };
    return { label: formatHHMMSSFromMs(diff), color: 'text-yellow-400' };
  }, [mounted, n, nextChaosGateTimeGetter]);

  // 필드보스
  const fieldBoss = useMemo(() => {
    if (!mounted) return { label: '대기중', color: 'text-gray-500', remain: 0 };
    const next = getNextFieldBossSpawn(n);
    if (!next) return { label: '미출현', color: 'text-gray-500', remain: 0 };

    // 정시 정확히 도달한 순간엔 진행중
    if (
      n.getMinutes() === 0 &&
      n.getSeconds() === 0 &&
      isFieldBossDay(n) &&
      isWithinFieldBossHours(n)
    ) {
      return { label: '진행중', color: 'text-green-500', remain: countRemainingFieldBossSpawns(n) };
    }

    const diff = next.getTime() - n.getTime();
    const remain = countRemainingFieldBossSpawns(n);
    return { label: formatHHMMSSFromMs(diff), color: 'text-yellow-400', remain };
  }, [mounted, n]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-4 justify-center">
        {/* 모험섬 */}
        <div className="flex items-center gap-2">
          <Image
            src={adventureIconSrc}
            alt="모험섬"
            width={20}
            height={20}
            className="object-contain"
            priority={false}
          />
          <span className={`text-sm font-bold ${adventure.color}`}>{adventure.label}</span>
        </div>

        {/* 필드보스 */}
        <div className="flex items-center gap-2">
          <Image
            src={fieldBossIconSrc}
            alt="필드보스"
            width={20}
            height={20}
            className="object-contain"
            priority={false}
          />
          <span className={`text-sm font-bold ${fieldBoss.color}`}>{fieldBoss.label}</span>
        </div>

        {/* 카오스게이트(선택) */}
        <div className="flex items-center gap-2">
          <Image
            src={chaosGateIconSrc}
            alt="카오스게이트"
            width={20}
            height={20}
            className="object-contain"
            priority={false}
          />
          <span className={`text-sm font-bold ${chaos.color}`}>{chaos.label}</span>
        </div>
      </div>

      {/* 필요 시 다음 등장 시각까지 함께 노출하려면 아래 예시를 사용하세요. */}
      {/* <div className="mt-2 text-xs text-neutral-400">
        서울 기준 시간 사용 중{forceSeoulTime ? '입니다.' : '이 아닙니다.'}
      </div> */}
    </div>
  );
}
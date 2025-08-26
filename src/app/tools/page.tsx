'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Card from '@/components/Card';


// 마켓 API 응답 형식에 맞는 타입 정의
interface MarketItem {
  Id: number;
  Name: string;
  Grade: string;
  Icon: string;
  BundleCount: number;
  TradeRemainCount: number | null;
  YDayAvgPrice: number;
  RecentPrice: number;
  CurrentMinPrice: number;
}



type CategoryKey = 'all' | 'enhancement' | 'battle' | 'cooking' | 'estate';

// Lostark 카테고리 코드 매핑 (실제 API 응답 기반)
const CATEGORY_CODE: Record<Exclude<CategoryKey, 'all'>, number> = {
  enhancement: 50000, // 강화재료 (융화 포함)
  battle: 60000,      // 배틀아이템
  cooking: 70000,     // 요리
  estate: 90000,      // 영지
};

const GRADE_COLOR: Record<string, string> = {
  '일반': 'text-gray-400',
  '고급': 'text-green-400',
  '희귀': 'text-blue-400',
  '영웅': 'text-purple-400',
  '전설': 'text-yellow-400',
  '유물': 'text-orange-400',
  '고대': 'text-red-400',
};

export default function ToolsPage() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MarketItem[]>([]);
  const [options, setOptions] = useState<unknown | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);



  const onSearch = async () => {
    setLoading(true);
    try {
      // 카테고리 코드 직접 설정
      let effectiveCategoryCode: number | undefined;
      
      // 카테고리가 선택되었으면 해당 코드 사용
      if (category !== 'all') {
        effectiveCategoryCode = CATEGORY_CODE[category];
        console.log(`Using category code: ${effectiveCategoryCode} for ${category}`);
      }
      
      console.log(`Final category code: ${effectiveCategoryCode}, Category: ${category}`);

      // 강화재료 카테고리일 때만 자동으로 "융화" 키워드 추가
      let searchKeyword = keyword;
      if (category === 'enhancement' && !keyword) {
        searchKeyword = '융화';
      }

      // 마켓 API 요청 형식에 맞춰 페이로드 구성
      const payload = {
        target: 'market',
        Sort: 'GRADE',
        CategoryCode: effectiveCategoryCode,
        CharacterClass: '',
        ItemTier: null,
        ItemGrade: '',
        ItemName: searchKeyword || '',
        SortCondition: 'ASC',
      };

      const res = await fetch('/tools/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      
      // 페이지 정보 업데이트
      if (data && typeof data === 'object' && 'TotalCount' in data) {
        setTotalCount((data as { TotalCount: number }).TotalCount || 0);
      }
      
      const raw = (data && typeof data === 'object' && 'Items' in data ? (data as { Items: MarketItem[] }).Items : []) as MarketItem[];
       
       // 제작 불가/불필요 아이템 블록리스트만 필터링
       const blockList = ['에스더의 기운'];
       const filtered = raw.filter((it) => !blockList.some((kw) => it.Name?.includes(kw)));
       
       setItems(filtered);
    } finally {
      setLoading(false);
    }
  };

  // 디바운싱된 검색 (첫 로딩 제외)
  useEffect(() => {
    // 첫 로딩이 아닌 경우에만 디바운싱 적용
    if (items.length > 0 || keyword || category !== 'all') {
      // 이전 타이머 취소
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // 새 타이머 설정 (500ms 후 검색 실행)
      const timer = setTimeout(() => {
        onSearch();
      }, 500);

      setSearchTimeout(timer);

      // 컴포넌트 언마운트 시 타이머 정리
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, keyword]);

  // 첫 진입 시 전체 노출 (한 번만 실행)
  useEffect(() => {
    onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 이미지 프리로딩
  useEffect(() => {
    if (items.length > 0) {
      // 처음 20개 이미지를 프리로딩
      items.slice(0, 20).forEach(item => {
        if (item.Icon) {
          const img = new window.Image();
          img.src = item.Icon;
        }
      });
    }
  }, [items]);

  useEffect(() => {
    const fetchOptions = async () => {
      const res = await fetch('/tools/api?type=options');
      const data = await res.json();
      setOptions(data);
    };
    fetchOptions();
  }, []);

  return (
    <section className="max-w-[1216px] mx-auto px-3 sm:px-4 mt-4">
      <Card className="text-left">
        <div className="flex flex-col gap-3">
          {/* 검색 영역 */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="아이템 검색"
              className="flex-1 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryKey)}
              className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
            >
              <option value="all">전체</option>
              <option value="enhancement">강화재료 (융화)</option>
              <option value="battle">배틀아이템</option>
              <option value="cooking">요리</option>
              <option value="estate">영지</option>
            </select>
          </div>

                      {/* 로딩 상태 */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-3"></div>
                <span className="text-text-secondary">데이터를 불러오는 중...</span>
              </div>
            )}

            {/* 결과 테이블 */}
            {!loading && (
              <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                <thead className="text-center text-text-secondary">
                  <tr>
                    <th className="w-10 p-2">★</th>
                    <th className="w-20 p-2">이미지</th>
                    <th className="min-w-[160px] p-2">이름</th>
                    <th className="w-28 p-2">현재시세</th>
                    <th className="w-28 p-2">제작비용</th>
                    <th className="w-28 p-2">판매차익</th>
                    <th className="w-28 p-2">원가이익률</th>
                    <th className="w-28 p-2">활동력 이익률</th>
                    <th className="w-32 p-2">주간평균판매량</th>
                  </tr>
                </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-text-secondary">검색 결과가 없습니다.</td>
                      </tr>
                    ) : (
                      items.map((it, idx) => {
                        // 가짜 계산치(향후 제작비, 이익률, 주간판매량 API 연동 필요)
                        const current = it.CurrentMinPrice ?? it.RecentPrice ?? it.YDayAvgPrice ?? 0;
                        const cost = Math.round(current * 0.7);
                        const margin = current - cost;
                        const roi = cost > 0 ? Math.round((margin / cost) * 100) : 0;
                        const energyRoi = Math.round(roi * 0.6);
                        

                        return (
                          <tr key={`${it.Id}-${idx}`} className="border-t border-zinc-800" data-item-id={it.Id}>
                            <td className="p-2 align-middle">
                              <button aria-label="즐겨찾기" className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">☆</button>
                            </td>
                                                    <td className="p-2 align-middle text-center">
                          {it.Icon ? (
                            <Image 
                              src={it.Icon} 
                              alt={it.Name} 
                              width={40} 
                              height={40} 
                              className="rounded object-contain"
                              priority={idx < 20} // 처음 20개는 우선 로딩
                              loading={idx < 20 ? "eager" : "lazy"}
                              unoptimized={true} // 외부 이미지 최적화 비활성화로 빠른 로딩
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                            />
                          ) : (
                            <div className="w-10 h-10 bg-zinc-700 rounded flex items-center justify-center">
                              <span className="text-xs text-zinc-400">?</span>
                            </div>
                          )}
                        </td>
                            <td className="p-2 align-middle">
                              <div className={`truncate ${it.Grade !== undefined && GRADE_COLOR[it.Grade] ? GRADE_COLOR[it.Grade] : ''}`}>{it.Name}</div>
                            </td>
                            <td className="p-2 align-middle text-right">{current.toLocaleString()}</td>
                            <td className="p-2 align-middle text-right">{cost.toLocaleString()}</td>
                            <td className="p-2 align-middle text-right">{margin.toLocaleString()}</td>
                            <td className="p-2 align-middle text-right">{roi}%</td>
                            <td className="p-2 align-middle text-right">{energyRoi}%</td>
                            <td className="p-2 align-middle text-right">
                              {/* 주간 평균은 현재 0으로 표시 (성능 최적화) */}
                              <span>0</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

           {/* 총 개수 표시 */}
           {totalCount > 0 && (
             <div className="text-center text-sm text-text-secondary mt-2">
               총 {totalCount}개 아이템
             </div>
           )}
        </div>
      </Card>
    </section>
  );
}





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
  item_type?: string; // 아이템 타입 (예: 오레하 융화재료)
  // 제작 정보 필드들
  item_unit?: number;
  item_energy?: number;
  item_production_time?: number;
  item_production_price?: number;
  item_charge?: number;
  item_sub1?: string;
  item_sub1_num?: number;
  item_sub1_unit?: number;
  item_sub2?: string;
  item_sub2_num?: number;
  item_sub2_unit?: number;
  item_sub3?: string;
  item_sub3_num?: number;
  item_sub3_unit?: number;
  item_sub4?: string;
  item_sub4_num?: number;
  item_sub4_unit?: number;
  item_sub5?: string;
  item_sub5_num?: number;
  item_sub5_unit?: number;
  item_sub6?: string;
  item_sub6_num?: number;
  item_sub6_unit?: number;
  // 재료 아이콘과 가격 정보
  item_sub1_icon?: string;
  item_sub1_price?: number;
  item_sub2_icon?: string;
  item_sub2_price?: number;
  item_sub3_icon?: string;
  item_sub3_price?: number;
  item_sub4_icon?: string;
  item_sub4_price?: number;
  item_sub5_icon?: string;
  item_sub5_price?: number;
  item_sub6_icon?: string;
  item_sub6_price?: number;
}

// 제작 정보 타입 정의
interface CraftingInfo {
  unit: number;        // 제작단위
  energy: number;      // 활동력
  time: number;        // 제작시간 (분)
  cost: number;        // 제작비용
  materials: Array<{
    name: string;      // 재료명
    count: number;     // 필요 개수
    unit: number;      // 판매 단위
    icon?: string;     // 재료 아이콘
    price?: number;    // 재료 가격
  }>;
}

type CategoryKey = 'all' | 'enhancement' | 'battle' | 'cooking' | 'estate' | 'favorites';

// Lostark 카테고리 코드 매핑 (실제 API 응답 기반)
const CATEGORY_CODE: Record<Exclude<CategoryKey, 'all' | 'favorites'>, number> = {
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



// 즐겨찾기 관리 훅
const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteItems, setFavoriteItems] = useState<MarketItem[]>([]);
  
  // 로컬 스토리지에서 즐겨찾기 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem('favorites');
      const savedItems = localStorage.getItem('favoriteItems');
      if (saved) {
        setFavorites(new Set(JSON.parse(saved)));
      }
      if (savedItems) {
        setFavoriteItems(JSON.parse(savedItems));
      }
    } catch (error) {
      console.error('즐겨찾기 로드 오류:', error);
    }
  }, []);
  
  // 즐겨찾기 토글
  const toggleFavorite = (item: MarketItem) => {
    const favoriteKey = `${item.Id}-${item.item_type || 'default'}`;
    const newFavorites = new Set(favorites);
    const newFavoriteItems = [...favoriteItems];
    
    if (newFavorites.has(favoriteKey)) {
      // 즐겨찾기 제거
      newFavorites.delete(favoriteKey);
      const itemIndex = newFavoriteItems.findIndex(favItem => 
        favItem.Id === item.Id && favItem.item_type === item.item_type
      );
      if (itemIndex > -1) {
        newFavoriteItems.splice(itemIndex, 1);
      }
    } else {
      // 즐겨찾기 추가
      newFavorites.add(favoriteKey);
      newFavoriteItems.push(item);
    }
    
    setFavorites(newFavorites);
    setFavoriteItems(newFavoriteItems);
    
    try {
      localStorage.setItem('favorites', JSON.stringify([...newFavorites]));
      localStorage.setItem('favoriteItems', JSON.stringify(newFavoriteItems));
    } catch (error) {
      console.error('즐겨찾기 저장 오류:', error);
    }
  };
  
  // 즐겨찾기 확인
  const isFavorite = (item: MarketItem) => {
    const favoriteKey = `${item.Id}-${item.item_type || 'default'}`;
    return favorites.has(favoriteKey);
  };
  
  return { favorites, favoriteItems, toggleFavorite, isFavorite };
};

export default function ToolsPage() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [loading, setLoading] = useState(true); // 초기 로딩 상태를 true로 설정
  const [items, setItems] = useState<MarketItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [craftingInfoMap, setCraftingInfoMap] = useState<Map<string, CraftingInfo>>(new Map());
  
  // 즐겨찾기 훅 사용
  const { favorites, favoriteItems, toggleFavorite, isFavorite } = useFavorites();

    // 아이템 클릭 핸들러
  const handleItemClick = async (item: MarketItem) => {
    const itemKey = `${item.Id}-${item.item_type || 'default'}`;
    console.log('🔍 아이템 클릭:', item.Name, item.Id, item.item_type);
    console.log('🔍 아이템 키:', itemKey);
    console.log('🔍 현재 expandedItems:', Array.from(expandedItems));
    
    const newExpandedItems = new Set(expandedItems);
    
    if (newExpandedItems.has(itemKey)) {
      // 이미 펼쳐진 아이템이면 접기
      newExpandedItems.delete(itemKey);
      console.log('📂 아이템 접기:', item.Name);
    } else {
      // 펼쳐지지 않은 아이템이면 펼치기
      newExpandedItems.add(itemKey);
      console.log('📂 아이템 펼치기:', item.Name);
      
      // 제작 정보가 없으면 실제 데이터로 생성
      if (!craftingInfoMap.has(itemKey)) {
          const materials = [];
          
          // 재료 정보 수집 (있는 경우만)
          if (item.item_sub1) {
            materials.push({
              name: item.item_sub1,
              count: item.item_sub1_num || 0,
              unit: item.item_sub1_unit || 1,
              icon: item.item_sub1_icon,
              price: item.item_sub1_price
            });
          }
          if (item.item_sub2) {
            materials.push({
              name: item.item_sub2,
              count: item.item_sub2_num || 0,
              unit: item.item_sub2_unit || 1,
              icon: item.item_sub2_icon,
              price: item.item_sub2_price
            });
          }
          if (item.item_sub3) {
            materials.push({
              name: item.item_sub3,
              count: item.item_sub3_num || 0,
              unit: item.item_sub3_unit || 1,
              icon: item.item_sub3_icon,
              price: item.item_sub3_price
            });
          }
          if (item.item_sub4) {
            materials.push({
              name: item.item_sub4,
              count: item.item_sub4_num || 0,
              unit: item.item_sub4_unit || 1,
              icon: item.item_sub4_icon,
              price: item.item_sub4_price
            });
          }
          if (item.item_sub5) {
            materials.push({
              name: item.item_sub5,
              count: item.item_sub5_num || 0,
              unit: item.item_sub5_unit || 1,
              icon: item.item_sub5_icon,
              price: item.item_sub5_price
            });
          }
          if (item.item_sub6) {
            materials.push({
              name: item.item_sub6,
              count: item.item_sub6_num || 0,
              unit: item.item_sub6_unit || 1,
              icon: item.item_sub6_icon,
              price: item.item_sub6_price
            });
          }
          
          const craftingInfo: CraftingInfo = {
            unit: item.item_unit || 0,
            energy: item.item_energy || 0,
            time: Math.floor((item.item_production_time || 0) / 60), // 초를 분으로 변환
            cost: item.item_production_price || 0,
            materials: materials
          };
        
        const newCraftingInfoMap = new Map(craftingInfoMap);
        newCraftingInfoMap.set(itemKey, craftingInfo);
        setCraftingInfoMap(newCraftingInfoMap);
      }
    }
    
    setExpandedItems(newExpandedItems);
  };

  const onSearch = async () => {
    setLoading(true);
    try {
      // 즐겨찾기 탭인 경우 API 호출하지 않음 (로컬에서 처리)
      if (category === 'favorites') {
        setLoading(false);
        return;
      }
      
      // 카테고리 코드 직접 설정
      let effectiveCategoryCode: number | undefined;
      
      // 카테고리가 선택되었으면 해당 코드 사용
      if (category !== 'all') {
        effectiveCategoryCode = CATEGORY_CODE[category];
      }
      
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (effectiveCategoryCode) params.append('categoryCode', effectiveCategoryCode.toString());
      
      const response = await fetch(`/tools/api?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        const items = data.Items || [];
        setItems(items);
        setTotalCount(data.TotalCount || 0);
        
        // 모든 아이템의 제작 정보를 미리 생성
        const newCraftingInfoMap = new Map(craftingInfoMap);
        
        items.forEach((item: MarketItem) => {
          const itemKey = `${item.Id}-${item.item_type || 'default'}`;
          if (!newCraftingInfoMap.has(itemKey)) {
            const materials = [];
            
            // 재료 정보 수집 (있는 경우만)
            if (item.item_sub1) {
              materials.push({
                name: item.item_sub1,
                count: item.item_sub1_num || 0,
                unit: item.item_sub1_unit || 1,
                icon: item.item_sub1_icon,
                price: item.item_sub1_price
              });
            }
            if (item.item_sub2) {
              materials.push({
                name: item.item_sub2,
                count: item.item_sub2_num || 0,
                unit: item.item_sub2_unit || 1,
                icon: item.item_sub2_icon,
                price: item.item_sub2_price
              });
            }
            if (item.item_sub3) {
              materials.push({
                name: item.item_sub3,
                count: item.item_sub3_num || 0,
                unit: item.item_sub3_unit || 1,
                icon: item.item_sub3_icon,
                price: item.item_sub3_price
              });
            }
            if (item.item_sub4) {
              materials.push({
                name: item.item_sub4,
                count: item.item_sub4_num || 0,
                unit: item.item_sub4_unit || 1,
                icon: item.item_sub4_icon,
                price: item.item_sub4_price
              });
            }
            if (item.item_sub5) {
              materials.push({
                name: item.item_sub5,
                count: item.item_sub5_num || 0,
                unit: item.item_sub5_unit || 1,
                icon: item.item_sub5_icon,
                price: item.item_sub5_price
              });
            }
            if (item.item_sub6) {
              materials.push({
                name: item.item_sub6,
                count: item.item_sub6_num || 0,
                unit: item.item_sub6_unit || 1,
                icon: item.item_sub6_icon,
                price: item.item_sub6_price
              });
            }
            
            const craftingInfo: CraftingInfo = {
              unit: item.item_unit || 0,
              energy: item.item_energy || 0,
              time: Math.floor((item.item_production_time || 0) / 60), // 초를 분으로 변환
              cost: item.item_production_price || 0,
              materials: materials
            };
            
            newCraftingInfoMap.set(itemKey, craftingInfo);
          }
        });
        
        setCraftingInfoMap(newCraftingInfoMap);
      } else {
        console.error('API 호출 실패:', data);
        setItems([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('검색 중 오류 발생:', error);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // 통합된 검색 및 카테고리 변경 처리
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // 즐겨찾기 탭인 경우 즉시 처리 (API 호출 없음)
    if (category === 'favorites') {
      setLoading(false);
      return;
    }

    // 컴포넌트 마운트 시나 키워드/카테고리 변경 시 검색 실행
    const timeout = setTimeout(() => {
    onSearch();
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [keyword, category]);

  // 즐겨찾기 필터링된 아이템
  const filteredItems = useMemo(() => {
    if (category === 'favorites') {
      // 즐겨찾기 탭인 경우 즐겨찾기된 아이템들 중에서 검색어로 필터링
      let filtered = favoriteItems;
      if (keyword && keyword.trim()) {
        const searchTerm = keyword.trim().toLowerCase();
        filtered = favoriteItems.filter(item => 
          item.Name.toLowerCase().includes(searchTerm)
        );
      }
      return filtered;
    }
    return items;
  }, [items, category, favoriteItems, keyword]);

  return (
    <section className="max-w-[1216px] mx-auto px-3 sm:px-4 mt-4">
      <Card className="text-left">
        <div className="flex flex-col gap-3">
          {/* 검색 영역 */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={category === 'favorites' ? "즐겨찾기에서 검색" : "아이템 검색"}
              className="flex-1 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 pr-8 text-sm"
            />

            <div className="relative w-full sm:w-auto">
                         <select
               value={category}
               onChange={(e) => setCategory(e.target.value as CategoryKey)}
                className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 pr-10 text-sm appearance-none"
             >
                <option value="all">전체</option>
               <option value="enhancement">강화재료 (융화)</option>
               <option value="battle">배틀아이템</option>
               <option value="cooking">요리</option>
               <option value="estate">영지</option>
                <option value="favorites">즐겨찾기</option>
             </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* 로딩 상태 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-3"></div>
              <span className="text-text-secondary">데이터를 불러오는 중...</span>
            </div>
          )}

          {/* 결과 표시 */}
          {!loading && (
            <>
              {/* PC 테이블 */}
              <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
                  <thead className="text-center text-text-secondary">
                    <tr>
                                                  <th className="w-10 p-2">
                              <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </th>
                      <th className="w-20 p-2">
                        <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </th>
                  <th className="min-w-[160px] p-2">이름</th>
                      <th className="w-28 p-2">시세</th>
                      <th className="w-28 p-2">제작비</th>
                      <th className="w-28 p-2">차익</th>
                      <th className="w-28 p-2">이익률</th>
                      <th className="w-28 p-2">활동력</th>
                </tr>
              </thead>
              <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-text-secondary">
                          {category === 'favorites' ? '즐겨찾기된 아이템이 없습니다.' : '검색 결과가 없습니다.'}
                     </td>
                  </tr>
                ) : (
                      filteredItems.map((it, idx) => {
                        // 실제 데이터 연동 필요 (현재는 0으로 표시)
                    const current = it.CurrentMinPrice ?? it.RecentPrice ?? it.YDayAvgPrice ?? 0;
                        const itemKey = `${it.Id}-${it.item_type || 'default'}`;
                        const craftingInfo = craftingInfoMap.get(itemKey);
                        // 제작비용 계산 (클릭하지 않아도 계산)
                        let totalCost = 0;
                        
                        // 제작 정보가 있으면 계산
                        if (craftingInfo) {
                          totalCost = craftingInfo.cost || 0; // 기본 제작비용
                          
                          // 재료 비용 계산
                          if (craftingInfo.materials) {
                            craftingInfo.materials.forEach(material => {
                              if (material.price && material.count && material.unit) {
                                // 재료 가격 × 재료 개수 / 재료 단위
                                const materialCost = (material.price * material.count) / material.unit;
                                totalCost += materialCost;
                              }
                            });
                          }
                        }
                        
                        const cost = Math.floor(totalCost); // 제작비 (정수로 반올림)
                        
                        // 수수료 5%를 고려한 차익 계산
                        const feeRate = 0.05; // 5% 수수료
                        const sellingPrice = current * (1 - feeRate); // 수수료 제외 판매가
                        const margin = Math.floor(sellingPrice - cost); // 차익
                        const roi = 0; // 이익률 - 실제 데이터 연동 필요
                        const energyRoi = 0; // 활동력 이익률 - 실제 데이터 연동 필요
                        
                        const isExpanded = expandedItems.has(itemKey);
                        const isFav = isFavorite(it);

                    return (
                          <React.Fragment key={`${it.Id}-${idx}`}>
                            <tr 
                              className="border-t border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors" 
                              data-item-id={it.Id}
                              onClick={() => handleItemClick(it)}
                            >
                        <td className="p-2 align-middle">
                                <button 
                                  aria-label="즐겨찾기" 
                                  className={`px-2 py-1 rounded transition-colors ${
                                    isFav 
                                      ? 'bg-[#bb86fc] hover:bg-[#a66ffc] text-white' 
                                      : 'bg-zinc-800 hover:bg-zinc-700'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(it);
                                  }}
                                >
                                  {isFav ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  )}
                                </button>
                        </td>
                              <td className="p-2 align-middle text-center">
                          {it.Icon ? (
                                  <Image 
                                    src={it.Icon} 
                                    alt={it.Name} 
                                    width={40} 
                                    height={40} 
                                    className="rounded object-contain"
                                    priority={idx < 20}
                                    loading={idx < 20 ? "eager" : "lazy"}
                                    unoptimized={true}
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
                                <div className={`truncate ${it.Grade !== undefined && GRADE_COLOR[it.Grade] ? GRADE_COLOR[it.Grade] : ''}`}>
                                  {it.Name}
                                  {it.item_type && (
                                    <span className="text-xs text-zinc-400 ml-1">({it.item_type})</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 align-middle text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span>{current.toLocaleString()}</span>
                                  <Image 
                                    src="/gold.png" 
                                    alt="골드" 
                                    width={16} 
                                    height={16} 
                                    className="object-contain"
                                  />
                                </div>
                              </td>
                              <td className="p-2 align-middle text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span>{cost.toLocaleString()}</span>
                                  <Image 
                                    src="/gold.png" 
                                    alt="골드" 
                                    width={16} 
                                    height={16} 
                                    className="object-contain"
                                  />
                                </div>
                              </td>
                              <td className="p-2 align-middle text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span>{margin.toLocaleString()}</span>
                                  <Image 
                                    src="/gold.png" 
                                    alt="골드" 
                                    width={16} 
                                    height={16} 
                                    className="object-contain"
                                  />
                                </div>
                        </td>
                        <td className="p-2 align-middle text-right">{roi}%</td>
                        <td className="p-2 align-middle text-right">{energyRoi}%</td>
                            </tr>
                            
                            {/* 제작 정보 행 */}
                            {isExpanded && craftingInfo && (
                              <tr className="bg-zinc-900/50">
                                <td colSpan={8} className="p-4">
                                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                                    <div className="flex items-center gap-3 mb-4">
                                      {it.Icon && (
                                        <Image 
                                          src={it.Icon} 
                                          alt={it.Name} 
                                          width={32} 
                                          height={32} 
                                          className="rounded object-contain"
                                          unoptimized={true}
                                        />
                                      )}
                                      <div>
                                        <h4 className={`text-sm font-semibold ${it.Grade && GRADE_COLOR[it.Grade] ? GRADE_COLOR[it.Grade] : ''}`}>
                                          {it.Name} - 제작 정보
                                        </h4>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      <div className="bg-zinc-700 rounded p-2 hover:bg-zinc-600 hover:scale-105 transition-all duration-200 cursor-pointer">
                                        <div className="text-xs text-zinc-400 mb-1">제작단위</div>
                                        <div className="text-sm font-semibold">{craftingInfo.unit}개</div>
                                      </div>
                                      <div className="bg-zinc-700 rounded p-2 hover:bg-zinc-600 hover:scale-105 transition-all duration-200 cursor-pointer">
                                        <div className="text-xs text-zinc-400 mb-1">활동력</div>
                                        <div className="text-sm font-semibold text-blue-400">{craftingInfo.energy}</div>
                                      </div>
                                      <div className="bg-zinc-700 rounded p-2 hover:bg-zinc-600 hover:scale-105 transition-all duration-200 cursor-pointer">
                                        <div className="text-xs text-zinc-400 mb-1">제작시간</div>
                                        <div className="text-sm font-semibold text-yellow-400">{craftingInfo.time}분</div>
                                      </div>
                                      <div className="bg-zinc-700 rounded p-2 hover:bg-zinc-600 hover:scale-105 transition-all duration-200 cursor-pointer">
                                        <div className="text-xs text-zinc-400 mb-1">제작비용</div>
                                        <div className="text-sm font-semibold text-green-400 flex items-center gap-1">
                                          <span>{craftingInfo.cost.toLocaleString()}</span>
                                          <Image 
                                            src="/gold.png" 
                                            alt="골드" 
                                            width={14} 
                                            height={14} 
                                            className="object-contain"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-3">
                                      <div className="text-xs text-zinc-400 mb-2">필요 재료</div>
                                      <div className="flex flex-wrap gap-2">
                                        {craftingInfo.materials.map((material, index) => (
                                          <div 
                                            key={index}
                                            className="flex items-center gap-2 px-3 py-2 bg-zinc-700 rounded-lg border border-zinc-600 hover:bg-zinc-600 hover:scale-105 hover:border-zinc-500 transition-all duration-200 cursor-pointer w-48 h-20"
                                          >
                                            <div className="w-6 h-6 bg-zinc-600 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                              {material.icon ? (
                                                <Image 
                                                  src={material.icon} 
                                                  alt={material.name} 
                                                  width={20} 
                                                  height={20} 
                                                  className="object-contain"
                                                  unoptimized={true}
                                                />
                                              ) : (
                                                <span className="text-xs text-zinc-300">📦</span>
                                              )}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                              <span className="text-xs font-medium text-zinc-200 truncate">{material.name}</span>
                                              <span className="text-xs text-zinc-400">
                                                {material.count}개 (단위: {material.unit})
                                              </span>
                                              {material.price && (
                                                <div className="flex items-center gap-1">
                                                  <span className="text-xs text-green-400">{material.price.toLocaleString()}</span>
                                                  <Image 
                                                    src="/gold.png" 
                                                    alt="골드" 
                                                    width={12} 
                                                    height={12} 
                                                    className="object-contain"
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                        </td>
                      </tr>
                            )}
                          </React.Fragment>
                    );
                  })
                )}
              </tbody>
                         </table>
           </div>

              {/* 모바일 카드 레이아웃 */}
              <div className="md:hidden space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary">
                    {category === 'favorites' ? '즐겨찾기된 아이템이 없습니다.' : '검색 결과가 없습니다.'}
                  </div>
                ) : (
                  filteredItems.map((it, idx) => {
                    const current = it.CurrentMinPrice ?? it.RecentPrice ?? it.YDayAvgPrice ?? 0;
                    const itemKey = `${it.Id}-${it.item_type || 'default'}`;
                    const craftingInfo = craftingInfoMap.get(itemKey);
                    // 제작비용 계산 (클릭하지 않아도 계산)
                    let totalCost = 0;
                    
                    // 제작 정보가 있으면 계산
                    if (craftingInfo) {
                      totalCost = craftingInfo.cost || 0; // 기본 제작비용
                      
                      // 재료 비용 계산
                      if (craftingInfo.materials) {
                        craftingInfo.materials.forEach(material => {
                          if (material.price && material.count && material.unit) {
                            // 재료 가격 × 재료 개수 / 재료 단위
                            const materialCost = (material.price * material.count) / material.unit;
                            totalCost += materialCost;
                          }
                        });
                      }
                    }
                    
                    const cost = Math.floor(totalCost); // 제작비 (정수로 반올림)
                    
                    // 수수료 5%를 고려한 차익 계산
                    const feeRate = 0.05; // 5% 수수료
                    const sellingPrice = current * (1 - feeRate); // 수수료 제외 판매가
                    const margin = Math.floor(sellingPrice - cost); // 차익
                    const roi = 0; // 이익률 - 실제 데이터 연동 필요
                    const energyRoi = 0; // 활동력 이익률 - 실제 데이터 연동 필요
                    
                    const isExpanded = expandedItems.has(itemKey);
                    const isFav = isFavorite(it);
                 
                 return (
                      <div key={`${it.Id}-${idx}`} className="bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                        {/* 메인 카드 */}
                        <div 
                          className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                          onClick={() => handleItemClick(it)}
                        >
                          <div className="flex items-center gap-3">
                            {/* 즐겨찾기 버튼 */}
                   <button
                              aria-label="즐겨찾기" 
                              className={`px-2 py-1 rounded transition-colors text-sm ${
                                isFav 
                                  ? 'bg-[#bb86fc] hover:bg-[#a66ffc] text-white' 
                                  : 'bg-zinc-700 hover:bg-zinc-600'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(it);
                              }}
                            >
                              {isFav ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              )}
                   </button>
                            
                            {/* 아이템 이미지 */}
                            <div className="flex-shrink-0">
                              {it.Icon ? (
                                <Image 
                                  src={it.Icon} 
                                  alt={it.Name} 
                                  width={48} 
                                  height={48} 
                                  className="rounded object-contain"
                                  priority={idx < 10}
                                  loading={idx < 10 ? "eager" : "lazy"}
                                  unoptimized={true}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-zinc-700 rounded flex items-center justify-center">
                                  <span className="text-sm text-zinc-400">?</span>
                                </div>
                              )}
                            </div>
                            
                            {/* 아이템 정보 */}
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-semibold truncate ${it.Grade !== undefined && GRADE_COLOR[it.Grade] ? GRADE_COLOR[it.Grade] : ''}`}>
                                {it.Name}
                                {it.item_type && (
                                  <span className="text-xs text-zinc-400 ml-1">({it.item_type})</span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                                <span>시세: {current.toLocaleString()}</span>
                                <Image 
                                  src="/gold.png" 
                                  alt="골드" 
                                  width={12} 
                                  height={12} 
                                  className="object-contain"
                                />
                              </div>
                            </div>
                            
                            {/* 화살표 아이콘 */}
                            <div className={`text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </div>
                          </div>
                          
                          {/* 요약 정보 */}
                          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                            <div className="bg-zinc-700/50 rounded p-2 text-center">
                              <div className="text-zinc-400">제작비</div>
                              <div className="font-semibold flex items-center justify-center gap-1">
                                <span>{cost.toLocaleString()}</span>
                                <Image 
                                  src="/gold.png" 
                                  alt="골드" 
                                  width={12} 
                                  height={12} 
                                  className="object-contain"
                                />
                              </div>
                            </div>
                            <div className="bg-zinc-700/50 rounded p-2 text-center">
                              <div className="text-zinc-400">차익</div>
                              <div className="font-semibold text-green-400 flex items-center justify-center gap-1">
                                <span>{margin.toLocaleString()}</span>
                                <Image 
                                  src="/gold.png" 
                                  alt="골드" 
                                  width={12} 
                                  height={12} 
                                  className="object-contain"
                                />
                              </div>
                            </div>
                            <div className="bg-zinc-700/50 rounded p-2 text-center">
                              <div className="text-zinc-400">이익률</div>
                              <div className="font-semibold text-yellow-400">{roi}%</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 제작 정보 (펼쳐진 상태) */}
                        {isExpanded && craftingInfo && (
                          <div className="border-t border-zinc-700/50 bg-zinc-900/30 p-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-zinc-700/50 rounded p-2 hover:bg-zinc-600/50 hover:scale-105 transition-all duration-200 cursor-pointer">
                                  <div className="text-xs text-zinc-400">제작단위</div>
                                  <div className="text-sm font-semibold">{craftingInfo.unit}개</div>
                                </div>
                                <div className="bg-zinc-700/50 rounded p-2 hover:bg-zinc-600/50 hover:scale-105 transition-all duration-200 cursor-pointer">
                                  <div className="text-xs text-zinc-400">활동력</div>
                                  <div className="text-sm font-semibold text-blue-400">{craftingInfo.energy}</div>
                                </div>
                                <div className="bg-zinc-700/50 rounded p-2 hover:bg-zinc-600/50 hover:scale-105 transition-all duration-200 cursor-pointer">
                                  <div className="text-xs text-zinc-400">제작시간</div>
                                  <div className="text-sm font-semibold text-yellow-400">{craftingInfo.time}분</div>
                                </div>
                                <div className="bg-zinc-700/50 rounded p-2 hover:bg-zinc-600/50 hover:scale-105 transition-all duration-200 cursor-pointer">
                                  <div className="text-xs text-zinc-400">제작비용</div>
                                  <div className="text-sm font-semibold text-green-400 flex items-center gap-1">
                                    <span>{craftingInfo.cost.toLocaleString()}</span>
                                    <Image 
                                      src="/gold.png" 
                                      alt="골드" 
                                      width={12} 
                                      height={12} 
                                      className="object-contain"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-xs text-zinc-400 mb-2">필요 재료</div>
                                <div className="flex flex-wrap gap-2">
                                  {craftingInfo.materials.map((material, index) => (
                                    <div 
                                      key={index}
                                      className="flex items-center gap-2 px-2 py-1 bg-zinc-700 rounded-lg border border-zinc-600 hover:bg-zinc-600 hover:scale-105 hover:border-zinc-500 transition-all duration-200 cursor-pointer w-36 h-16"
                                    >
                                      <div className="w-4 h-4 bg-zinc-600 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {material.icon ? (
                                          <Image 
                                            src={material.icon} 
                                            alt={material.name} 
                                            width={16} 
                                            height={16} 
                                            className="object-contain"
                                            unoptimized={true}
                                          />
                                        ) : (
                                          <span className="text-xs text-zinc-300">📦</span>
                                        )}
                                      </div>
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-xs font-medium text-zinc-200 truncate">{material.name}</span>
                                        <span className="text-xs text-zinc-400">
                                          {material.count}개 (단위: {material.unit})
                                        </span>
                                        {material.price && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs text-green-400">{material.price.toLocaleString()}</span>
                                            <Image 
                                              src="/gold.png" 
                                              alt="골드" 
                                              width={10} 
                                              height={10} 
                                              className="object-contain"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* 총 개수 표시 */}
          {totalCount > 0 && category !== 'favorites' && (
            <div className="text-center text-sm text-text-secondary mt-2">
              총 {totalCount}개 아이템
             </div>
           )}
           
          {/* 즐겨찾기 개수 표시 */}
          {category === 'favorites' && (
             <div className="text-center text-sm text-text-secondary mt-2">
              즐겨찾기 {favoriteItems.length}개 아이템
             </div>
           )}
        </div>
      </Card>
    </section>
  );
}





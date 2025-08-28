// src/app/lib/api.ts
import type {
  LostarkNotice, LostarkEvent, LostarkAlarmItem,
  LostarkAlarmResponse, LostarkGameContent
} from '@/types/lostark';
import { insertData, executeQuery } from './database';

const LOSTARK_API_KEY = process.env.LOSTARK_API_KEY;

const BASE_URL = 'https://developer-lostark.game.onstove.com';
const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  // Lostark 문서 요구: "authorization: bearer <JWT>"
  'Authorization': `bearer ${LOSTARK_API_KEY}`,
};

async function fetchLostarkData<T>(path: string, revalidateTime = 3600): Promise<T | null> {
  if (!LOSTARK_API_KEY) {
    console.error('LOSTARK_API_KEY is not defined.');
    return null;
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: DEFAULT_HEADERS,
      next: { revalidate: revalidateTime }
    });
    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText} - ${errorMsg}`);
    }
    return res.json() as Promise<T>;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getLostarkNotices(limit = 5): Promise<LostarkNotice[]> {
  const data = await fetchLostarkData<LostarkNotice[]>('/news/notices', 1800);
  
  // 데이터베이스에 저장
  if (data) {
    try {
      for (const notice of data) {
        await insertData('notices', {
          title: notice.Title,
          content: notice.Thumbnail, // Content 대신 Thumbnail 사용
          link: notice.Link,
          date: notice.Date,
          type: 'notice'
        });
      }
    } catch (error) {
      console.error('공지사항 데이터베이스 저장 오류:', error);
    }
  }
  
  return data?.slice(0, limit) ?? [];
}

export async function getLostarkEvents(limit = 5): Promise<LostarkEvent[]> {
  const data = await fetchLostarkData<LostarkEvent[]>('/news/events', 3600);
  
  // 데이터베이스에 저장
  if (data) {
    try {
      for (const event of data) {
        await insertData('events', {
          title: event.Title,
          content: event.Thumbnail, // Content 대신 Thumbnail 사용
          link: event.Link,
          start_date: event.StartDate,
          end_date: event.EndDate,
          thumbnail: event.Thumbnail
        });
      }
    } catch (error) {
      console.error('이벤트 데이터베이스 저장 오류:', error);
    }
  }
  
  return data?.slice(0, limit) ?? [];
}

export async function getLostarkAlarms(limit = 5): Promise<LostarkAlarmItem[]> {
  const data = await fetchLostarkData<LostarkAlarmResponse>('/news/alarms', 3600);
  
  // 데이터베이스에 저장
  if (data?.Alarms) {
    try {
      for (const alarm of data.Alarms) {
        await insertData('alarms', {
          title: alarm.AlarmType, // Title 대신 AlarmType 사용
          content: alarm.Contents, // Content 대신 Contents 사용
          link: '', // Link 속성이 없으므로 빈 문자열
          date: alarm.StartDate, // Date 대신 StartDate 사용
          type: 'alarm'
        });
      }
    } catch (error) {
      console.error('알람 데이터베이스 저장 오류:', error);
    }
  }
  
  return data?.Alarms?.slice(0, limit) ?? [];
}

export async function getLostarkGameCalendar(): Promise<LostarkGameContent[]> {
  const data = await fetchLostarkData<LostarkGameContent[]>('/gamecontents/calendar', 300);
  
  // 데이터베이스에 저장 (중복 제거)
  if (data) {
    try {
      // 중복 제거: 같은 이름의 콘텐츠는 하나만 유지
      const uniqueData = data.filter((content, index, self) => 
        index === self.findIndex(c => c.ContentsName === content.ContentsName)
      );
      
      console.log(`🔍 중복 제거: ${data.length}개 → ${uniqueData.length}개`);
      
      for (const content of uniqueData) {
        await insertData('game_contents', {
          category_name: content.CategoryName,
          contents_name: content.ContentsName,
          contents_icon: content.ContentsIcon,
          min_item_level: content.MinItemLevel,
          location: content.Location,
          start_times: JSON.stringify(content.StartTimes),
          reward_items: JSON.stringify(content.RewardItems)
        });
      }
    } catch (error) {
      console.error('게임 콘텐츠 데이터베이스 저장 오류:', error);
    }
  }
  
  return data ?? [];
}

// 데이터베이스에서 데이터 조회 함수들
// 메모리 캐시 (5분)
const noticesCache = { data: null as LostarkNotice[] | null, timestamp: 0 };
const eventsCache = { data: null as LostarkEvent[] | null, timestamp: 0 };
const gameContentsCache = { data: null as LostarkGameContent[] | null, timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// 캐시 초기화 함수
export function clearGameContentsCache() {
  gameContentsCache.data = null;
  gameContentsCache.timestamp = 0;
  console.log('🧹 게임 콘텐츠 캐시 초기화 완료');
}

export async function getNoticesFromDB(limit = 10): Promise<LostarkNotice[]> {
  try {
    // 캐시 확인
    if (noticesCache.data && Date.now() - noticesCache.timestamp < CACHE_DURATION) {
      console.log('📦 공지사항 캐시에서 조회');
      return noticesCache.data.slice(0, limit);
    }
    
    console.log('🔍 공지사항 DB 조회 시작...');
    const query = `SELECT title as Title, content as Thumbnail, link as Link, date as Date FROM notices ORDER BY date DESC LIMIT ${limit}`;
    const result = await executeQuery(query, []);
    console.log('✅ 공지사항 DB 조회 완료:', result.length, '개');
    
    // 캐시 업데이트
    noticesCache.data = result as LostarkNotice[];
    noticesCache.timestamp = Date.now();
    
    return result as LostarkNotice[];
  } catch (error) {
    console.error('❌ 공지사항 조회 오류:', error);
    return [];
  }
}

export async function getEventsFromDB(limit = 10): Promise<LostarkEvent[]> {
  try {
    // 캐시 확인
    if (eventsCache.data && Date.now() - eventsCache.timestamp < CACHE_DURATION) {
      console.log('📦 이벤트 캐시에서 조회');
      return eventsCache.data.slice(0, limit);
    }
    
    console.log('🔍 이벤트 DB 조회 시작...');
    const query = `SELECT title as Title, content as Thumbnail, link as Link, start_date as StartDate, end_date as EndDate FROM events ORDER BY start_date DESC LIMIT ${limit}`;
    const result = await executeQuery(query, []);
    console.log('✅ 이벤트 DB 조회 완료:', result.length, '개');
    
    // 캐시 업데이트
    eventsCache.data = result as LostarkEvent[];
    eventsCache.timestamp = Date.now();
    
    return result as LostarkEvent[];
  } catch (error) {
    console.error('❌ 이벤트 조회 오류:', error);
    return [];
  }
}

export async function getGameContentsFromDB(): Promise<LostarkGameContent[]> {
  try {
    console.log('🔍 getGameContentsFromDB 함수 시작...');
    
    // 캐시 확인
    if (gameContentsCache.data && Date.now() - gameContentsCache.timestamp < CACHE_DURATION) {
      console.log('📦 게임 콘텐츠 캐시에서 조회');
      return gameContentsCache.data;
    }
    
    console.log('🔍 게임 콘텐츠 DB 조회 시작...');
    const query = `SELECT 
      category_name as CategoryName,
      contents_name as ContentsName,
      contents_icon as ContentsIcon,
      min_item_level as MinItemLevel,
      location as Location,
      start_times as StartTimes,
      reward_items as RewardItems
    FROM game_contents ORDER BY created_at DESC`;
    
    console.log('🔍 SQL 쿼리 실행:', query);
    const result = await executeQuery(query, []); // 빈 배열 전달
    
    console.log('✅ 게임 콘텐츠 DB 조회 완료:', result.length, '개');
    console.log('🔍 첫 번째 결과 샘플:', result[0]);
    
    // DB에서 이미 JSON 객체로 저장되어 있으므로 직접 사용
    const parsedResult = result.map((item: any) => {
      try {
        return {
          ...item,
          StartTimes: Array.isArray(item.StartTimes) ? item.StartTimes : [],
          RewardItems: Array.isArray(item.RewardItems) ? item.RewardItems : []
        };
      } catch (error) {
        console.error('❌ 데이터 변환 오류 (아이템:', item.ContentsName || 'unknown', '):', error);
        return {
          ...item,
          StartTimes: [],
          RewardItems: []
        };
      }
    }) as LostarkGameContent[];
    
    // 중복 제거: 같은 이름의 콘텐츠는 첫 번째만 유지
    const uniqueResult = parsedResult.filter((item, index, self) => 
      index === self.findIndex(i => i.ContentsName === item.ContentsName)
    );
    
    console.log('🔍 중복 제거 전:', parsedResult.length, '개');
    console.log('🔍 중복 제거 후:', uniqueResult.length, '개');
    
    // 캐시 업데이트
    gameContentsCache.data = uniqueResult;
    gameContentsCache.timestamp = Date.now();
    
    return uniqueResult;
  } catch (error) {
    console.error('❌ 게임 콘텐츠 조회 오류:', error);
    return [];
  }
}

// 거래소 아이템 검색 (키워드/카테고리)
export interface AuctionItemSummary {
  Id: number;
  Name: string;
  Grade: string;
  Icon: string;
  TradeRemainCount?: number;
  CurrentMinPrice?: number;
  RecentPrice?: number;
  AvgPrice?: number;
}

// ---------------- Market (마켓) ----------------
export interface MarketSearchRequest {
  Sort?: 'GRADE' | 'NAME' | 'CURRENT_MIN_PRICE' | 'RECENT_PRICE' | 'AVG_PRICE';
  CategoryCode?: number;
  CharacterClass?: string;
  ItemTier?: number | null;
  ItemGrade?: string;
  ItemName?: string;
  PageNo?: number;
  SortCondition?: 'ASC' | 'DESC';
}

export interface MarketItemListEntry {
  Id: number;
  Name: string;
  Grade?: string;
  Icon?: string;
  CurrentMinPrice?: number;
  RecentPrice?: number;
  AvgPrice?: number;
}

export interface MarketSearchResponse {
  PageNo: number;
  PageSize: number;
  TotalCount: number;
  Items: MarketItemListEntry[];
}

export interface MarketItemStatPoint {
  Date: string;
  AvgPrice: number;
  TradeCount: number;
}

export interface MarketItemDetail {
  Name: string;
  TradeRemainCount: number | null;
  BundleCount: number;
  Stats: MarketItemStatPoint[];
  ToolTip: string;
}

export interface AuctionSearchRequest {
  ItemName?: string;
  CategoryCode?: number;
  Sort?: 'CURRENT_MIN_PRICE' | 'RECENT_PRICE' | 'AVG_PRICE' | 'NAME';
  SortDirection?: 'ASC' | 'DESC';
  PageNo?: number;
}

export interface AuctionSearchResponse {
  PageNo: number;
  PageSize: number;
  TotalCount: number;
  Items: AuctionItemSummary[];
}

export async function searchAuction(params: AuctionSearchRequest): Promise<AuctionSearchResponse | null> {
  const body = {
    ItemName: params.ItemName ?? '',
    CategoryCode: params.CategoryCode ?? 0,
    Sort: params.Sort ?? 'CURRENT_MIN_PRICE',
    SortDirection: params.SortDirection ?? 'DESC',
    PageNo: params.PageNo ?? 1,
  };

  try {
    const res = await fetch(`${BASE_URL}/auctions/items`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to search auctions: ${res.status} ${res.statusText} - ${err}`);
    }
    return (await res.json()) as AuctionSearchResponse;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// 마켓 아이템 데이터 저장 함수
export async function saveMarketItemsToDB(items: Record<string, unknown>[], categoryCode?: number) {
  try {
    for (const item of items) {
      // 필수 필드 검증
      if (!item || !item.Name) {
        console.log(`⚠️ 아이템 ID ${item.Id}: name 필드가 없어 저장을 건너뜁니다.`);
        continue;
      }

      const cleanData = {
        item_id: item.Id,
        name: item.Name || 'Unknown',
        grade: item.Grade || '일반',
        icon: item.Icon || null,
        current_min_price: item.CurrentMinPrice || 0,
        recent_price: item.RecentPrice || 0,
        avg_price: item.YDayAvgPrice || 0,
        category_code: categoryCode || null,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      await insertData('market_items', cleanData);
    }
    console.log(`✅ ${items.length}개의 마켓 아이템을 데이터베이스에 저장했습니다.`);
  } catch (error) {
    console.error('마켓 아이템 데이터베이스 저장 오류:', error);
  }
}

// 마켓 아이템 상세 데이터 저장 함수
export async function saveMarketItemDetailToDB(itemId: number, detailData: Record<string, unknown>) {
  try {
    // 필수 필드 검증
    if (!detailData || !detailData.Name) {
      console.log(`⚠️ 아이템 ID ${itemId}: name 필드가 없어 저장을 건너뜁니다.`);
      return;
    }

    // 데이터 검증 및 정리
    const cleanData = {
      item_id: itemId,
      name: detailData.Name || 'Unknown',
      trade_remain_count: detailData.TradeRemainCount || null,
      bundle_count: detailData.BundleCount || null,
      stats: detailData.Stats ? JSON.stringify(detailData.Stats) : null,
      tool_tip: detailData.ToolTip || null,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    await insertData('market_item_details', cleanData);
    console.log(`✅ 아이템 ID ${itemId}의 상세 정보를 데이터베이스에 저장했습니다.`);
  } catch (error) {
    console.error('마켓 아이템 상세 데이터베이스 저장 오류:', error);
  }
}

// 거래소 아이템 데이터 저장 함수
export async function saveAuctionItemsToDB(items: Record<string, unknown>[]) {
  try {
    for (const item of items) {
      // 필수 필드 검증
      if (!item || !item.Name) {
        console.log(`⚠️ 아이템 ID ${item.Id}: name 필드가 없어 저장을 건너뜁니다.`);
        continue;
      }

      const cleanData = {
        item_id: item.Id,
        name: item.Name || 'Unknown',
        grade: item.Grade || '일반',
        icon: item.Icon || null,
        trade_remain_count: item.TradeRemainCount || null,
        current_min_price: item.CurrentMinPrice || 0,
        recent_price: item.RecentPrice || 0,
        avg_price: item.AvgPrice || 0,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      await insertData('auction_items', cleanData);
    }
    console.log(`✅ ${items.length}개의 거래소 아이템을 데이터베이스에 저장했습니다.`);
  } catch (error) {
    console.error('거래소 아이템 데이터베이스 저장 오류:', error);
  }
}

// API 호출 로그 저장 함수
export async function saveApiLogToDB(endpoint: string, method: string, statusCode: number, responseTime: number, errorMessage?: string) {
  try {
    await insertData('api_logs', {
      endpoint,
      method,
      status_code: statusCode,
      response_time: responseTime,
      error_message: errorMessage || null,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  } catch (error) {
    console.error('API 로그 저장 오류:', error);
  }
}
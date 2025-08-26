import { NextRequest, NextResponse } from 'next/server';
import { saveMarketItemDetailToDB, saveApiLogToDB } from '@/app/lib/api';
import { executeQuery } from '@/app/lib/database';

const BASE_URL = 'https://developer-lostark.game.onstove.com';

// 간단한 메모리 캐시
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30000; // 30초

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  
  // 마켓 검색을 위한 GET 요청 처리
  const keyword = searchParams.get('keyword');
  const categoryCode = searchParams.get('categoryCode');
  
  let query = '';
  let params: (string | number)[] = [];
  
  try {
    // 캐시 키 생성
    const cacheKey = JSON.stringify({ keyword, categoryCode });
    
    // 캐시 확인
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 캐시에서 조회 (GET)');
      const responseTime = Date.now() - startTime;
      await saveApiLogToDB('/tools/api', 'GET', 200, responseTime);
      return NextResponse.json(cached.data);
    }
    
    // 데이터베이스에서 조회 (재료 정보 포함)
    query = `
      SELECT 
        m.item_id as Id,
        m.name as Name,
        m.grade as Grade,
        m.icon as Icon,
        m.current_min_price as CurrentMinPrice,
        m.recent_price as RecentPrice,
        m.avg_price as YDayAvgPrice,
        m.item_type,
        m.item_unit,
        m.item_energy,
        m.item_production_time,
        m.item_production_price,
        m.item_charge,
        m.item_sub1, m.item_sub1_num, m.item_sub1_unit,
        m.item_sub2, m.item_sub2_num, m.item_sub2_unit,
        m.item_sub3, m.item_sub3_num, m.item_sub3_unit,
        m.item_sub4, m.item_sub4_num, m.item_sub4_unit,
        m.item_sub5, m.item_sub5_num, m.item_sub5_unit,
        m.item_sub6, m.item_sub6_num, m.item_sub6_unit,
        -- 재료1 정보
        COALESCE(sub1.icon, '') as item_sub1_icon,
        COALESCE(sub1.current_min_price, 0) as item_sub1_price,
        -- 재료2 정보
        COALESCE(sub2.icon, '') as item_sub2_icon,
        COALESCE(sub2.current_min_price, 0) as item_sub2_price,
        -- 재료3 정보
        COALESCE(sub3.icon, '') as item_sub3_icon,
        COALESCE(sub3.current_min_price, 0) as item_sub3_price,
        -- 재료4 정보
        COALESCE(sub4.icon, '') as item_sub4_icon,
        COALESCE(sub4.current_min_price, 0) as item_sub4_price,
        -- 재료5 정보
        COALESCE(sub5.icon, '') as item_sub5_icon,
        COALESCE(sub5.current_min_price, 0) as item_sub5_price,
        -- 재료6 정보
        COALESCE(sub6.icon, '') as item_sub6_icon,
        COALESCE(sub6.current_min_price, 0) as item_sub6_price,
        m.created_at,
        m.updated_at
      FROM market_items m
      LEFT JOIN market_items sub1 ON m.item_sub1 = sub1.name AND sub1.name IS NOT NULL
      LEFT JOIN market_items sub2 ON m.item_sub2 = sub2.name AND sub2.name IS NOT NULL
      LEFT JOIN market_items sub3 ON m.item_sub3 = sub3.name AND sub3.name IS NOT NULL
      LEFT JOIN market_items sub4 ON m.item_sub4 = sub4.name AND sub4.name IS NOT NULL
      LEFT JOIN market_items sub5 ON m.item_sub5 = sub5.name AND sub5.name IS NOT NULL
      LEFT JOIN market_items sub6 ON m.item_sub6 = sub6.name AND sub6.name IS NOT NULL
      WHERE 1=1
    `;
    
    const params: (string | number)[] = [];
    
    // 카테고리 필터
    if (categoryCode) {
      query += ' AND m.category_code = ?';
      params.push(parseInt(categoryCode));
    }
    
    // 이름 검색
    if (keyword && keyword.trim()) {
      const searchTerm = keyword.trim();
      console.log('🔍 검색어 (GET):', searchTerm);
      query += ` AND m.name LIKE ?`;
      params.push(`%${searchTerm}%`);
    }
    
    // 정렬
    query += ' ORDER BY m.grade ASC, m.name ASC';
    
    // 결과 제한
    query += ' LIMIT 500';
    
    console.log('🔍 데이터베이스 쿼리 (GET):', query);
    console.log('📝 파라미터 (GET):', params);
    
    const items = await executeQuery(query, params);
    console.log('📦 조회된 아이템 개수 (GET):', items.length);
    
    const responseData = {
      TotalCount: items.length,
      Items: items
    };
    
    // 캐시에 저장
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    
    const responseTime = Date.now() - startTime;
    await saveApiLogToDB('/tools/api', 'GET', 200, responseTime);
    
    console.log('✅ 데이터베이스 조회 성공 (GET):', responseData);
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('❌ 데이터베이스 조회 오류 (GET):', error);
    console.error('❌ 오류 상세 정보:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      query: query,
      params: params
    });
    const responseTime = Date.now() - startTime;
    await saveApiLogToDB('/tools/api', 'GET', 500, responseTime, error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ 
      error: 'Database query failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 마켓 검색 - 데이터베이스에서 조회
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const body = await req.json().catch(() => ({}));
  
  try {
    const target: 'auction' | 'market' = body?.target === 'market' ? 'market' : 'auction';
    
    // 마켓 검색인 경우 데이터베이스에서 조회
    if (target === 'market') {
      const { CategoryCode, ItemName, Sort = 'GRADE', SortCondition = 'ASC' } = body;
      
      // 캐시 키 생성
      const cacheKey = JSON.stringify({ CategoryCode, ItemName, Sort, SortCondition });
      
      // 캐시 확인
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 캐시에서 조회');
        const responseTime = Date.now() - startTime;
        await saveApiLogToDB('/tools/api', 'POST', 200, responseTime);
        return NextResponse.json(cached.data);
      }
      
      try {
        // 데이터베이스에서 조회 (성능 최적화)
        let query = `
          SELECT 
            item_id as Id,
            name as Name,
            grade as Grade,
            icon as Icon,
            current_min_price as CurrentMinPrice,
            recent_price as RecentPrice,
            avg_price as YDayAvgPrice,
            created_at,
            updated_at
          FROM market_items 
          WHERE 1=1
        `;
        
        const params: (string | number)[] = [];
        
        // 카테고리 필터 (인덱스 활용)
        if (CategoryCode) {
          query += ' AND category_code = ?';
          params.push(CategoryCode);
        }
        
        // 이름 검색 (단순화된 검색으로 성능 향상)
        if (ItemName && ItemName.trim()) {
          const searchTerm = ItemName.trim();
          console.log('🔍 검색어:', searchTerm);
          // 단순 LIKE 검색으로 성능 향상
          query += ` AND name LIKE ?`;
          params.push(`%${searchTerm}%`);
        }
        
        // 정렬 단순화 (성능 향상)
        query += ' ORDER BY name ASC';
        
        // 결과 제한 (성능 향상)
        query += ' LIMIT 500';
        
        console.log('🔍 데이터베이스 쿼리:', query);
        console.log('📝 파라미터:', params);
        
        const items = await executeQuery(query, params);
        console.log('📦 조회된 아이템 개수:', items.length);
        
        const responseData = {
          TotalCount: items.length,
          Items: items
        };
        
        // 캐시에 저장
        cache.set(cacheKey, { data: responseData, timestamp: Date.now() });
        
        const responseTime = Date.now() - startTime;
        await saveApiLogToDB('/tools/api', 'POST', 200, responseTime);
        
        console.log('✅ 데이터베이스 조회 성공:', responseData);
        return NextResponse.json(responseData);
        
      } catch (dbError) {
        console.error('❌ 데이터베이스 조회 오류:', dbError);
        
        // 데이터베이스 조회 실패 시 원본 API로 폴백
        console.log('🔄 원본 API로 폴백...');
        const apiKey = process.env.LOSTARK_API_KEY;
        if (!apiKey) {
          return NextResponse.json({ error: 'Missing LOSTARK_API_KEY' }, { status: 500 });
        }
        
        const endpoint = '/markets/items';
        const payload = {
          Sort: 'GRADE',
          CategoryCode: CategoryCode,
          CharacterClass: '',
          ItemTier: null,
          ItemGrade: '',
          ItemName: ItemName || '',
          SortCondition: SortCondition,
        };
        
        const res = await fetch(`https://developer-lostark.game.onstove.com${endpoint}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        const text = await res.text();
        const responseTime = Date.now() - startTime;
        await saveApiLogToDB(endpoint, 'POST', res.status, responseTime);
        
        return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    // 거래소 검색인 경우 기존 로직 사용
    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing LOSTARK_API_KEY' }, { status: 500 });
    }
    
    const endpoint = '/auctions/items';
    
    // 업스트림이 허용하는 필드만 전달
    const { ItemName, CategoryCode, Sort, SortDirection } = body || {};
    const payload = {
      ...(ItemName ? { ItemName } : {}),
      ...(typeof CategoryCode === 'number' ? { CategoryCode } : {}),
      ...(Sort ? { Sort } : {}),
      ...(SortDirection ? { SortDirection } : {}),
    };
   
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      next: { revalidate: 0 },
    });
    const text = await res.text();

    const passHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    const limit = res.headers.get('X-RateLimit-Limit');
    const remain = res.headers.get('X-RateLimit-Remaining');
    const reset = res.headers.get('X-RateLimit-Reset');
    if (limit) passHeaders['X-RateLimit-Limit'] = limit;
    if (remain) passHeaders['X-RateLimit-Remaining'] = remain;
    if (reset) passHeaders['X-RateLimit-Reset'] = reset;

    if (!res.ok) {
      const body = text ? (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })() : { message: 'Upstream error with empty body' };
      const responseTime = Date.now() - startTime;
      await saveApiLogToDB(endpoint, 'POST', res.status, responseTime, body.message || 'Upstream error');
      return new NextResponse(JSON.stringify({ error: 'Upstream error', upstreamStatus: res.status, statusText: res.statusText, body }), { status: res.status, headers: passHeaders });
    }

    if (!text) {
      const responseTime = Date.now() - startTime;
      await saveApiLogToDB(endpoint, 'POST', res.status, responseTime);
      return new NextResponse(JSON.stringify({ empty: true, upstreamStatus: res.status, statusText: res.statusText }), { status: 200, headers: passHeaders });
    }

    const responseTime = Date.now() - startTime;
    await saveApiLogToDB(endpoint, 'POST', res.status, responseTime);

    return new NextResponse(text, { status: 200, headers: passHeaders });
  } catch (e) {
    const responseTime = Date.now() - startTime;
    await saveApiLogToDB('/tools/api', 'POST', 500, responseTime, e instanceof Error ? e.message : 'Unknown error');
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}



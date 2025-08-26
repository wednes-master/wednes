import { NextRequest, NextResponse } from 'next/server';
import { saveMarketItemDetailToDB, saveApiLogToDB } from '@/app/lib/api';
import { executeQuery } from '@/app/lib/database';

const BASE_URL = 'https://developer-lostark.game.onstove.com';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing LOSTARK_API_KEY' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const itemId = searchParams.get('itemId');

  let endpoint = '';
  if (type === 'options') {
    endpoint = '/markets/options';
  } else if (type === 'detail' && itemId) {
    endpoint = `/markets/items/${itemId}`;
  } else {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `bearer ${apiKey}`,
      },
      next: { revalidate: type === 'options' ? 86400 : 60 },
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
      await saveApiLogToDB(endpoint, 'GET', res.status, responseTime, body.message || 'Upstream error');
      return new NextResponse(JSON.stringify({ error: 'Upstream error', upstreamStatus: res.status, statusText: res.statusText, body }), { status: res.status, headers: passHeaders });
    }

    if (!text) {
      const responseTime = Date.now() - startTime;
      await saveApiLogToDB(endpoint, 'GET', res.status, responseTime);
      return new NextResponse(JSON.stringify({ empty: true, upstreamStatus: res.status, statusText: res.statusText }), { status: 200, headers: passHeaders });
    }

    const data = JSON.parse(text);
    
    // 데이터베이스에 저장 (상세 정보만)
    if (type === 'detail' && itemId && data) {
      try {
        // 데이터 검증
        if (data && Array.isArray(data) && data.length > 0) {
          await saveMarketItemDetailToDB(parseInt(itemId), data[0]);
        } else if (data && typeof data === 'object') {
          await saveMarketItemDetailToDB(parseInt(itemId), data);
        } else {
          console.log(`⚠️ 아이템 ID ${itemId}: 유효하지 않은 상세 데이터`);
        }
      } catch (error) {
        console.error('마켓 아이템 상세 정보 저장 오류:', error);
      }
    }

    const responseTime = Date.now() - startTime;
    await saveApiLogToDB(endpoint, 'GET', res.status, responseTime);

    return new NextResponse(text, { status: 200, headers: passHeaders });
  } catch (e) {
    const responseTime = Date.now() - startTime;
    await saveApiLogToDB('/tools/api', 'GET', 500, responseTime, e instanceof Error ? e.message : 'Unknown error');
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

// 간단한 메모리 캐시
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30000; // 30초

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



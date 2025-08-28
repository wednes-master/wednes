import { NextRequest, NextResponse } from 'next/server';
import { saveMarketItemDetailToDB, saveApiLogToDB } from '@/app/lib/api';
import { executeQuery } from '@/app/lib/database';

const BASE_URL = 'https://developer-lostark.game.onstove.com';

// DB 업데이트 함수
async function updateMarketItemsInDB(items: any[], categoryCode: number) {
  try {
    const updateTime = new Date().toLocaleString('ko-KR');
    
    let updatedCount = 0;
    let insertedCount = 0;
    let priceChangedCount = 0;
    
    for (const item of items) {
      const existing = await executeQuery(
        'SELECT id, current_min_price FROM market_items WHERE item_id = ? AND name = ?',
        [item.Id, item.Name]
      );

      if (existing.length > 0) {
        const oldPrice = existing[0].current_min_price;
        const newPrice = item.CurrentMinPrice;
        
        if (oldPrice !== newPrice && (Number(newPrice) - Number(oldPrice)) !== 0) {
          console.log(`💰 [${updateTime}] ${item.Name}: ${Number(oldPrice).toLocaleString()} → ${Number(newPrice).toLocaleString()} (${Number(newPrice) > Number(oldPrice) ? '+' : ''}${(Number(newPrice) - Number(oldPrice)).toLocaleString()})`);
          priceChangedCount++;
        }
        
        await executeQuery(
          'UPDATE market_items SET current_min_price = ?, recent_price = ?, avg_price = ?, updated_at = NOW() WHERE item_id = ? AND name = ?',
          [item.CurrentMinPrice, item.RecentPrice, item.YDayAvgPrice, item.Id, item.Name]
        );
        updatedCount++;
      } else {
        await executeQuery(
          'INSERT INTO market_items (item_id, name, grade, icon, current_min_price, recent_price, avg_price, category_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [item.Id, item.Name, item.Grade, item.Icon, item.CurrentMinPrice, item.RecentPrice, item.YDayAvgPrice, categoryCode]
        );
        insertedCount++;
      }
    }
    
    if (priceChangedCount > 0) {
      console.log(`📊 [${updateTime}] 가격 변동: ${priceChangedCount}개 아이템`);
    } else {
      console.log(`📊 [${updateTime}] 가격 변동 없음`);
    }
    
    return { updated: updatedCount, inserted: insertedCount };
  } catch (error) {
    console.error('❌ DB 업데이트 오류:', error);
    return { updated: 0, inserted: 0 };
  }
}

// 가격 변동 감지 함수
function generatePriceHash(items: any[]): string {
  return items.map(item => `${item.Id}:${item.CurrentMinPrice}:${item.RecentPrice}`).join('|');
}

// 스마트 캐시 (개선된 버전)
const cache = new Map<string, { 
  data: any; 
  timestamp: number;
  priceHash?: string;
  categoryCode?: number;
}>();
const CACHE_DURATION = 3000; // 3초로 단축 (더 빠른 응답)

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  
  const keyword = searchParams.get('keyword');
  const categoryCode = searchParams.get('categoryCode');
  
  let query = '';
  let params: (string | number)[] = [];
  
  try {
    // 캐시 키 생성 (카테고리별로 분리)
    const cacheKey = JSON.stringify({ keyword, categoryCode });
    const cached = cache.get(cacheKey);
    
    // 캐시가 유효하고 최신인 경우 즉시 반환
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      const responseTime = Date.now() - startTime;
      await saveApiLogToDB('/tools/api', 'GET', 200, responseTime);
      return NextResponse.json(cached.data);
    }
    
    try {
      const allCategories = [
        { code: 50000, name: 'enhancement', filter: '융화' },
        { code: 60000, name: 'battle' },
        { code: 70000, name: 'cooking' },
        { code: 90000, name: 'estate' },
      ];
      
      const currentMinute = Math.floor(Date.now() / 60000);
      const categoryIndex = currentMinute % allCategories.length;
      const category = allCategories[categoryIndex];
      
      try {
        let allItems: any[] = [];
        let pageNo = 1;
        const pageSize = 10;
        
        while (true) {
          const payload = {
            Sort: 'GRADE',
            CategoryCode: category.code,
            CharacterClass: '',
            ItemTier: null,
            ItemGrade: '',
            ItemName: category.filter || '',
            PageNo: pageNo,
            PageSize: pageSize,
            SortCondition: 'ASC',
          };
          
          const response = await fetch(`${BASE_URL}/markets/items`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Authorization': `bearer ${process.env.LOSTARK_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          
          if (!response.ok) {
            console.error(`❌ ${category.name} 카테고리 API 호출 실패: ${response.status}`);
            break;
          }
          
          const pageData = await response.json();
          const items = pageData.Items || [];
          
          if (items.length === 0) {
            break;
          }
          
          allItems = allItems.concat(items);
          
          if (items.length < pageSize) {
            break;
          }
          
          pageNo++;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (allItems.length > 0) {
          await updateMarketItemsInDB(allItems, category.code);
        }
      } catch (error) {
        console.error(`❌ ${category.name} 카테고리 처리 오류:`, error);
      }
    } catch (apiError) {
      console.error('❌ 로스트아크 API 호출 실패:', apiError);
    }
    
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
        COALESCE(sub1.icon, '') as item_sub1_icon,
        COALESCE(sub1.current_min_price, 0) as item_sub1_price,
        COALESCE(sub2.icon, '') as item_sub2_icon,
        COALESCE(sub2.current_min_price, 0) as item_sub2_price,
        COALESCE(sub3.icon, '') as item_sub3_icon,
        COALESCE(sub3.current_min_price, 0) as item_sub3_price,
        COALESCE(sub4.icon, '') as item_sub4_icon,
        COALESCE(sub4.current_min_price, 0) as item_sub4_price,
        COALESCE(sub5.icon, '') as item_sub5_icon,
        COALESCE(sub5.current_min_price, 0) as item_sub5_price,
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
    
    params = [];
    
    if (categoryCode) {
      query += ' AND m.category_code = ?';
      params.push(parseInt(categoryCode));
      
      if (parseInt(categoryCode) === 50000) {
        query += ' AND m.name LIKE ?';
        params.push('%융화%');
      }
    } else {
      // 전체 카테고리인 경우, 강화재료(50000)는 "융화" 포함 아이템만 표시
      query += ' AND (m.category_code != 50000 OR (m.category_code = 50000 AND m.name LIKE ?))';
      params.push('%융화%');
    }
    
    if (keyword && keyword.trim()) {
      const searchTerm = keyword.trim();
      query += ` AND m.name LIKE ?`;
      params.push(`%${searchTerm}%`);
    }
    
    query += ' ORDER BY m.grade ASC, m.name ASC';
    query += ' LIMIT 500';
    
    const items = await executeQuery(query, params);
    
    const responseData = {
      TotalCount: items.length,
      Items: items
    };
    
    const priceHash = generatePriceHash(items);
    cache.set(cacheKey, { 
      data: responseData, 
      timestamp: Date.now(),
      priceHash: priceHash
    });
    
    const responseTime = Date.now() - startTime;
    await saveApiLogToDB('/tools/api', 'GET', 200, responseTime);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('❌ 데이터베이스 조회 오류 (GET):', error);
    const responseTime = Date.now() - startTime;
    await saveApiLogToDB('/tools/api', 'GET', 500, responseTime, error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ 
      error: 'Database query failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const body = await req.json().catch(() => ({}));
  
  try {
    const target: 'auction' | 'market' = body?.target === 'market' ? 'market' : 'auction';
    
    if (target === 'market') {
      const { CategoryCode, ItemName, Sort = 'GRADE', SortCondition = 'ASC' } = body;
      
      const cacheKey = JSON.stringify({ CategoryCode, ItemName, Sort, SortCondition });
      
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        const responseTime = Date.now() - startTime;
        await saveApiLogToDB('/tools/api', 'POST', 200, responseTime);
        return NextResponse.json(cached.data);
      }
      
      try {
        let query = `
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
            COALESCE(sub1.icon, '') as item_sub1_icon,
            COALESCE(sub1.current_min_price, 0) as item_sub1_price,
            COALESCE(sub2.icon, '') as item_sub2_icon,
            COALESCE(sub2.current_min_price, 0) as item_sub2_price,
            COALESCE(sub3.icon, '') as item_sub3_icon,
            COALESCE(sub3.current_min_price, 0) as item_sub3_price,
            COALESCE(sub4.icon, '') as item_sub4_icon,
            COALESCE(sub4.current_min_price, 0) as item_sub4_price,
            COALESCE(sub5.icon, '') as item_sub5_icon,
            COALESCE(sub5.current_min_price, 0) as item_sub5_price,
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
        
        let params: (string | number)[] = [];
        
        if (CategoryCode) {
          query += ' AND m.category_code = ?';
          params.push(CategoryCode);
          
          if (CategoryCode === 50000) {
            query += ' AND m.name LIKE ?';
            params.push('%융화%');
          }
        } else {
          // 전체 카테고리인 경우, 강화재료(50000)는 "융화" 포함 아이템만 표시
          query += ' AND (m.category_code != 50000 OR (m.category_code = 50000 AND m.name LIKE ?))';
          params.push('%융화%');
        }
        
        if (ItemName && ItemName.trim()) {
          const searchTerm = ItemName.trim();
          query += ` AND m.name LIKE ?`;
          params.push(`%${searchTerm}%`);
        }
        
        query += ' ORDER BY m.grade ASC, m.name ASC';
        query += ' LIMIT 500';
        
        const items = await executeQuery(query, params);
        
        const responseData = {
          TotalCount: items.length,
          Items: items
        };
        
        const priceHash = generatePriceHash(items);
        cache.set(cacheKey, { 
          data: responseData, 
          timestamp: Date.now(),
          priceHash: priceHash
        });
        
        const responseTime = Date.now() - startTime;
        await saveApiLogToDB('/tools/api', 'POST', 200, responseTime);
        
        return NextResponse.json(responseData);
        
      } catch (dbError) {
        console.error('❌ 데이터베이스 조회 오류:', dbError);
        
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
    
    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing LOSTARK_API_KEY' }, { status: 500 });
    }
    
    const endpoint = '/auctions/items';
    
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
    });
    
    const text = await res.text();
    const responseTime = Date.now() - startTime;
    await saveApiLogToDB(endpoint, 'POST', res.status, responseTime);
    
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('❌ POST 요청 처리 오류:', error);
    const responseTime = Date.now() - startTime;
    await saveApiLogToDB('/tools/api', 'POST', 500, responseTime, error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ 
      error: 'Request processing failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

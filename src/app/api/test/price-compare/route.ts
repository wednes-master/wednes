import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

const BASE_URL = 'https://developer-lostark.game.onstove.com';

// 로스트아크 API 호출 함수
async function fetchLostarkMarketData(categoryCode: number, keyword?: string) {
  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    throw new Error('LOSTARK_API_KEY가 설정되지 않았습니다.');
  }

  const payload = {
    Sort: 'GRADE',
    CategoryCode: categoryCode,
    CharacterClass: '',
    ItemTier: null,
    ItemGrade: '',
    ItemName: keyword || '',
    PageNo: 1,
    PageSize: 1000, // 전체 아이템 가져오기
    SortCondition: 'ASC',
  };

  const response = await fetch(`${BASE_URL}/markets/items`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`로스트아크 API 호출 실패: ${response.status}`);
  }

  return await response.json();
}

export async function GET() {
  try {
    console.log('🔍 생고기 가격 비교 시작...');
    
    // 1. DB에서 생고기 가격 조회
    console.log('📊 DB에서 생고기 가격 조회...');
    const dbResult = await executeQuery(
      'SELECT item_id, name, current_min_price, recent_price, avg_price, updated_at FROM market_items WHERE name LIKE ? ORDER BY updated_at DESC LIMIT 5',
      ['%생고기%']
    );
    
    console.log('📊 DB 결과:', dbResult);
    
    // 2. 로스트아크 API에서 생고기 가격 조회 (전체 페이지)
    console.log('🔄 로스트아크 API에서 생고기 가격 조회...');
    
    let allItems: any[] = [];
    let pageNo = 1;
    const pageSize = 10; // API가 10개만 반환하므로 10으로 설정
    
    while (true) {
      const payload = {
        Sort: 'GRADE',
        CategoryCode: 70000,
        CharacterClass: '',
        ItemTier: null,
        ItemGrade: '',
        ItemName: '',
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
        throw new Error(`로스트아크 API 호출 실패: ${response.status}`);
      }
      
      const pageData = await response.json();
      const items = pageData.Items || [];
      
      if (items.length === 0) {
        break; // 더 이상 아이템이 없으면 종료
      }
      
      allItems = allItems.concat(items);
      console.log(`📦 페이지 ${pageNo}: ${items.length}개 아이템`);
      
      // 61개를 모두 가져왔는지 확인
      if (allItems.length >= 61 || items.length < pageSize) {
        break; // 마지막 페이지
      }
      
      pageNo++;
    }
    
    const apiData = { Items: allItems };
    
    console.log('🔄 API 결과:', apiData);
    
    // 3. 생고기 아이템 찾기
    const apiItems = apiData?.Items || [];
    const rawMeatItem = apiItems.find((item: any) => 
      item.Name && item.Name.includes('생고기')
    );
    
    // 4. 비교 결과 생성
    const comparison = {
      timestamp: new Date().toISOString(),
      db: {
        items: dbResult,
        count: dbResult.length
      },
      api: {
        items: apiItems,
        count: apiItems.length,
        rawMeat: rawMeatItem
      },
      difference: null
    };
    
    // 5. 가격 비교
    if (dbResult.length > 0 && rawMeatItem) {
      const dbPrice = dbResult[0].current_min_price;
      const apiPrice = rawMeatItem.CurrentMinPrice;
      const difference = Math.abs(dbPrice - apiPrice);
      
      comparison.difference = {
        dbPrice,
        apiPrice,
        difference,
        isDifferent: dbPrice !== apiPrice,
        percentage: dbPrice > 0 ? ((difference / dbPrice) * 100).toFixed(2) : '0'
      };
      
      console.log('💰 가격 비교 결과:');
      console.log(`   DB 가격: ${dbPrice}`);
      console.log(`   API 가격: ${apiPrice}`);
      console.log(`   차이: ${difference}`);
      console.log(`   차이율: ${comparison.difference.percentage}%`);
    }
    
    return NextResponse.json(comparison);
    
  } catch (error) {
    console.error('❌ 가격 비교 오류:', error);
    return NextResponse.json({ 
      error: '가격 비교 실패', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

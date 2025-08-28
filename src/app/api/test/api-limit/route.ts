import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://developer-lostark.game.onstove.com';

export async function GET() {
  try {
    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'LOSTARK_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
    }

    console.log('🔍 API 제한 테스트 시작...');

    // 테스트 1: PageSize 1000으로 시도
    console.log('📤 테스트 1: PageSize 1000');
    const test1Payload = {
      Sort: 'GRADE',
      CategoryCode: 70000,
      CharacterClass: '',
      ItemTier: null,
      ItemGrade: '',
      ItemName: '',
      PageNo: 1,
      PageSize: 1000,
      SortCondition: 'ASC',
    };

    const response1 = await fetch(`${BASE_URL}/markets/items`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(test1Payload),
    });

    const data1 = await response1.json();
    console.log('📥 테스트 1 결과:', {
      status: response1.status,
      totalCount: data1.TotalCount,
      itemCount: data1.Items?.length || 0,
      firstItem: data1.Items?.[0]?.Name || 'none'
    });

    // 테스트 2: PageSize 100으로 시도
    console.log('📤 테스트 2: PageSize 100');
    const test2Payload = {
      ...test1Payload,
      PageSize: 100
    };

    const response2 = await fetch(`${BASE_URL}/markets/items`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(test2Payload),
    });

    const data2 = await response2.json();
    console.log('📥 테스트 2 결과:', {
      status: response2.status,
      totalCount: data2.TotalCount,
      itemCount: data2.Items?.length || 0,
      firstItem: data2.Items?.[0]?.Name || 'none'
    });

    // 테스트 3: 생고기 검색
    console.log('📤 테스트 3: 생고기 검색');
    const test3Payload = {
      ...test1Payload,
      PageSize: 100,
      ItemName: '생고기'
    };

    const response3 = await fetch(`${BASE_URL}/markets/items`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(test3Payload),
    });

    const data3 = await response3.json();
    console.log('📥 테스트 3 결과:', {
      status: response3.status,
      totalCount: data3.TotalCount,
      itemCount: data3.Items?.length || 0,
      items: data3.Items?.map((item: any) => item.Name) || []
    });

    return NextResponse.json({
      test1: {
        status: response1.status,
        totalCount: data1.TotalCount,
        itemCount: data1.Items?.length || 0
      },
      test2: {
        status: response2.status,
        totalCount: data2.TotalCount,
        itemCount: data2.Items?.length || 0
      },
      test3: {
        status: response3.status,
        totalCount: data3.TotalCount,
        itemCount: data3.Items?.length || 0,
        items: data3.Items?.map((item: any) => item.Name) || []
      }
    });

  } catch (error) {
    console.error('❌ API 제한 테스트 오류:', error);
    return NextResponse.json({ 
      error: 'API 제한 테스트 실패', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://developer-lostark.game.onstove.com';

export async function GET() {
  try {
    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'LOSTARK_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
    }

    console.log('🔑 API 키 확인:', apiKey.substring(0, 10) + '...');

    const payload = {
      Sort: 'GRADE',
      CategoryCode: 70000, // 요리 카테고리
      CharacterClass: '',
      ItemTier: null,
      ItemGrade: '',
      ItemName: '',
      PageNo: 1,
      PageSize: 10, // 10개만 테스트
      SortCondition: 'ASC',
    };

    console.log('📤 API 요청:', payload);

    const response = await fetch(`${BASE_URL}/markets/items`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 API 응답 상태:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 호출 실패:', errorText);
      return NextResponse.json({ 
        error: 'API 호출 실패', 
        status: response.status,
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API 호출 성공:', data);

    return NextResponse.json({
      success: true,
      status: response.status,
      itemCount: data.Items?.length || 0,
      firstItem: data.Items?.[0] || null,
      data: data
    });

  } catch (error) {
    console.error('❌ API 테스트 오류:', error);
    return NextResponse.json({ 
      error: 'API 테스트 실패', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

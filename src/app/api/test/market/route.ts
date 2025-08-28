import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'LOSTARK_API_KEY가 설정되지 않았습니다.'
      }, { status: 500 });
    }

    // 테스트용 페이로드 (강화재료 카테고리, 1페이지만)
    const payload = {
      Sort: 'GRADE',
      CategoryCode: 50000, // 강화재료 카테고리
      CharacterClass: '',
      ItemTier: null,
      ItemGrade: '',
      ItemName: '융화', // 융화 필터
      PageNo: 1,
      PageSize: 10, // 테스트용으로 10개만
      SortCondition: 'ASC',
    };

    console.log('🧪 마켓 API 테스트 시작...');

    const res = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      
      console.log('✅ 마켓 API 테스트 성공!');
      console.log(`📦 받아온 아이템 수: ${data.Items?.length || 0}`);
      
      // 첫 번째 아이템 정보 로깅
      if (data.Items && data.Items.length > 0) {
        const firstItem = data.Items[0];
        console.log('🔍 첫 번째 아이템:', {
          Name: firstItem.Name,
          Id: firstItem.Id,
          Grade: firstItem.Grade,
          CurrentMinPrice: firstItem.CurrentMinPrice
        });
      }

      return NextResponse.json({
        success: true,
        message: '마켓 API 테스트 성공',
        data: {
          totalItems: data.Items?.length || 0,
          firstItem: data.Items?.[0] || null,
          sampleItems: data.Items?.slice(0, 3) || []
        }
      });
    } else {
      const errorText = await res.text();
      console.error('❌ 마켓 API 테스트 실패:', res.status, errorText);
      
      return NextResponse.json({
        success: false,
        message: '마켓 API 호출 실패',
        error: {
          status: res.status,
          statusText: res.statusText,
          details: errorText
        }
      }, { status: res.status });
    }

  } catch (error) {
    console.error('❌ 마켓 API 테스트 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '마켓 API 테스트 중 오류 발생',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

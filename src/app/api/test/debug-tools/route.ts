import { NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

export async function GET() {
  try {
    // 1. 현재 DB의 생고기 관련 아이템들 조회
    const dbItems = await executeQuery(
      `SELECT item_id, name, current_min_price, recent_price, updated_at 
       FROM market_items 
       WHERE name LIKE '%생고기%' 
       ORDER BY name ASC`,
      []
    );

    // 2. 최근 업데이트된 아이템들 조회 (5분 이내)
    const recentUpdates = await executeQuery(
      `SELECT item_id, name, current_min_price, recent_price, updated_at 
       FROM market_items 
       WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       ORDER BY updated_at DESC 
       LIMIT 10`,
      []
    );

    // 3. 전체 아이템 개수
    const totalCount = await executeQuery(
      'SELECT COUNT(*) as count FROM market_items',
      []
    );

    // 4. 카테고리별 아이템 개수
    const categoryCounts = await executeQuery(
      `SELECT category_code, COUNT(*) as count 
       FROM market_items 
       GROUP BY category_code 
       ORDER BY category_code`,
      []
    );

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      debug: {
        dbItems: dbItems,
        recentUpdates: recentUpdates,
        totalCount: totalCount[0]?.count || 0,
        categoryCounts: categoryCounts
      }
    });

  } catch (error) {
    console.error('❌ 디버깅 엔드포인트 오류:', error);
    return NextResponse.json({
      error: '디버깅 실패',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

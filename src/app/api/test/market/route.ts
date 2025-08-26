import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

export async function GET() {
  try {
    // 전체 마켓 아이템 개수 조회
    const totalCount = await executeQuery('SELECT COUNT(*) as count FROM market_items');
    
    // 최근 10개 아이템 조회
    const recentItems = await executeQuery(`
      SELECT 
        item_id as Id,
        name as Name,
        grade as Grade,
        icon as Icon,
        current_min_price as CurrentMinPrice,
        recent_price as RecentPrice,
        avg_price as YDayAvgPrice,
        category_code,
        created_at,
        updated_at
      FROM market_items 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    // 카테고리별 개수 조회
    const categoryCounts = await executeQuery(`
      SELECT 
        category_code,
        COUNT(*) as count
      FROM market_items 
      GROUP BY category_code
      ORDER BY category_code
    `);

    return NextResponse.json({
      success: true,
      data: {
        totalCount: totalCount[0]?.count || 0,
        recentItems,
        categoryCounts
      }
    });

  } catch (error) {
    console.error('마켓 테스트 API 오류:', error);
    return NextResponse.json({
      success: false,
      message: '마켓 테스트 API 오류',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

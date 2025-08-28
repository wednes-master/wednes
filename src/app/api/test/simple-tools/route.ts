import { NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

export async function GET() {
  try {
    // 간단한 쿼리로 생고기 아이템 조회
    const query = `
      SELECT 
        item_id as Id,
        name as Name,
        grade as Grade,
        icon as Icon,
        current_min_price as CurrentMinPrice,
        item_type,
        item_energy,
        item_production_time,
        item_production_price,
        item_sub1, item_sub1_num
      FROM market_items 
      WHERE name LIKE '%생고기%'
      LIMIT 3
    `;

    const items = await executeQuery(query, []);
    
    return NextResponse.json({
      success: true,
      totalItems: items.length,
      items: items,
      message: '간단한 Tools API 테스트'
    });

  } catch (error) {
    console.error('❌ 간단한 Tools API 테스트 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

export async function GET() {
  try {
    // Tools API와 동일한 쿼리 실행
    const query = `
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
      WHERE m.name LIKE '%생고기%'
      ORDER BY m.grade ASC, m.name ASC
      LIMIT 5
    `;

    const items = await executeQuery(query, []);
    
    // 첫 번째 아이템의 모든 필드 확인
    const firstItem = items[0];
    const fieldNames = firstItem ? Object.keys(firstItem) : [];

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      query: query,
      totalItems: items.length,
      fieldNames: fieldNames,
      firstItem: firstItem,
      allItems: items
    });

  } catch (error) {
    console.error('❌ Tools API 응답 디버깅 오류:', error);
    return NextResponse.json({
      error: '디버깅 실패',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

export async function GET() {
  try {
    // 1. 제작 정보가 있는 아이템들 조회
    const craftingItems = await executeQuery(
      `SELECT 
        item_id, 
        name, 
        item_energy,
        item_production_time,
        item_production_price,
        item_sub1, item_sub1_num
       FROM market_items 
       WHERE item_energy > 0 
       OR item_production_time > 0
       OR item_production_price > 0
       OR item_sub1 IS NOT NULL
       LIMIT 10`,
      []
    );

    // 2. 전체 아이템 중 제작 정보가 있는 비율
    const totalCount = await executeQuery(
      'SELECT COUNT(*) as count FROM market_items',
      []
    );

    const craftingCount = await executeQuery(
      `SELECT COUNT(*) as count 
       FROM market_items 
       WHERE item_energy > 0 
       OR item_production_time > 0
       OR item_production_price > 0
       OR item_sub1 IS NOT NULL`,
      []
    );

    // 3. 테이블 구조 확인
    const tableStructure = await executeQuery(
      `DESCRIBE market_items`,
      []
    );

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      craftingItems: craftingItems,
      totalCount: totalCount[0]?.count || 0,
      craftingCount: craftingCount[0]?.count || 0,
      tableStructure: tableStructure,
      message: '제작 정보 확인'
    });

  } catch (error) {
    console.error('❌ 제작 정보 확인 오류:', error);
    return NextResponse.json({
      error: '확인 실패',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

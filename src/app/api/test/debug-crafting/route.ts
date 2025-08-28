import { NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

export async function GET() {
  try {
    // 1. 제작 정보가 있는 아이템들 조회
    const craftingItems = await executeQuery(
      `SELECT 
        item_id, 
        name, 
        item_type,
        item_unit,
        item_energy,
        item_production_time,
        item_production_price,
        item_charge,
        item_sub1, item_sub1_num, item_sub1_unit,
        item_sub2, item_sub2_num, item_sub2_unit,
        item_sub3, item_sub3_num, item_sub3_unit,
        item_sub4, item_sub4_num, item_sub4_unit,
        item_sub5, item_sub5_num, item_sub5_unit,
        item_sub6, item_sub6_num, item_sub6_unit
       FROM market_items 
       WHERE item_type IS NOT NULL 
       OR item_energy IS NOT NULL 
       OR item_production_time IS NOT NULL
       LIMIT 10`,
      []
    );

    // 2. 생고기 관련 아이템의 제작 정보
    const meatItems = await executeQuery(
      `SELECT 
        item_id, 
        name, 
        item_type,
        item_unit,
        item_energy,
        item_production_time,
        item_production_price,
        item_charge,
        item_sub1, item_sub1_num, item_sub1_unit,
        item_sub2, item_sub2_num, item_sub2_unit,
        item_sub3, item_sub3_num, item_sub3_unit,
        item_sub4, item_sub4_num, item_sub4_unit,
        item_sub5, item_sub5_num, item_sub5_unit,
        item_sub6, item_sub6_num, item_sub6_unit
       FROM market_items 
       WHERE name LIKE '%생고기%'`,
      []
    );

    // 3. 테이블 구조 확인
    const tableStructure = await executeQuery(
      `DESCRIBE market_items`,
      []
    );

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      debug: {
        craftingItems: craftingItems,
        meatItems: meatItems,
        tableStructure: tableStructure
      }
    });

  } catch (error) {
    console.error('❌ 제작 정보 디버깅 오류:', error);
    return NextResponse.json({
      error: '디버깅 실패',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

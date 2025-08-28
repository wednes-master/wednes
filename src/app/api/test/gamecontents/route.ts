import { NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

export async function GET() {
  try {
    console.log('🔍 게임 콘텐츠 데이터 확인...');
    
    // 전체 게임 콘텐츠 조회
    const query = `SELECT * FROM game_contents ORDER BY created_at DESC LIMIT 5`;
    const result = await executeQuery(query, []);
    
    // 카테고리별 개수 확인
    const categoryQuery = `SELECT category_name, COUNT(*) as count FROM game_contents GROUP BY category_name`;
    const categoryResult = await executeQuery(categoryQuery, []);
    
    return NextResponse.json({
      success: true,
      totalCount: result.length,
      sampleData: result,
      categoryCounts: categoryResult,
      message: '게임 콘텐츠 데이터 확인 완료'
    });

  } catch (error) {
    console.error('❌ 게임 콘텐츠 테스트 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

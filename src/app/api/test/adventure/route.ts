import { NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

export async function GET() {
  try {
    console.log('🔍 모험섬 데이터 확인...');
    
    // 모험섬 데이터만 조회
    const query = `SELECT * FROM game_contents WHERE category_name = '모험 섬' ORDER BY created_at DESC LIMIT 10`;
    const result = await executeQuery(query, []);
    
    // 현재 날짜 정보
    const now = new Date();
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    // 각 모험섬의 시간 정보 분석
    const analyzedData = result.map((item: any) => {
      const startTimes = Array.isArray(item.start_times) ? item.start_times : [];
      const upcomingTimes = startTimes.filter((time: string) => {
        const eventDate = new Date(time);
        return eventDate >= currentDate;
      });
      
      return {
        name: item.contents_name,
        startTimes: startTimes,
        upcomingTimes: upcomingTimes,
        isUpcoming: upcomingTimes.length > 0,
        totalTimes: startTimes.length,
        upcomingCount: upcomingTimes.length
      };
    });
    
    return NextResponse.json({
      success: true,
      currentDate: currentDate.toISOString(),
      totalAdventureIslands: result.length,
      data: analyzedData,
      summary: {
        total: result.length,
        upcoming: analyzedData.filter((item: any) => item.isUpcoming).length,
        past: analyzedData.filter((item: any) => !item.isUpcoming).length
      }
    });

  } catch (error) {
    console.error('❌ 모험섬 테스트 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

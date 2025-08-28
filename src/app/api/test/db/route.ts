import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DB 테스트 시작...');

    // 1. 공지사항 테이블 확인
    const noticesQuery = 'SELECT * FROM notices LIMIT 3';
    const noticesResult = await executeQuery(noticesQuery, []);
    
    // 2. 이벤트 테이블 확인
    const eventsQuery = 'SELECT * FROM events LIMIT 3';
    const eventsResult = await executeQuery(eventsQuery, []);
    
    // 3. 게임 콘텐츠 테이블 확인 (더 자세히)
    const gameContentsQuery = 'SELECT * FROM game_contents LIMIT 5';
    const gameContentsResult = await executeQuery(gameContentsQuery, []);
    
    // 4. 게임 콘텐츠 컬럼 정보 확인
    const columnsQuery = "DESCRIBE game_contents";
    const columnsResult = await executeQuery(columnsQuery, []);

    return NextResponse.json({
      success: true,
      data: {
        notices: {
          count: noticesResult.length,
          sample: noticesResult,
          columns: noticesResult.length > 0 ? Object.keys(noticesResult[0] as object) : []
        },
        events: {
          count: eventsResult.length,
          sample: eventsResult,
          columns: eventsResult.length > 0 ? Object.keys(eventsResult[0] as object) : []
        },
        gameContents: {
          count: gameContentsResult.length,
          sample: gameContentsResult,
          columns: columnsResult,
          rawData: gameContentsResult.map((item: any) => ({
            ContentsName: item.contents_name,
            StartTimes: item.start_times,
            RewardItems: item.reward_items,
            StartTimesType: typeof item.start_times,
            RewardItemsType: typeof item.reward_items,
            StartTimesLength: item.start_times?.length,
            RewardItemsLength: item.reward_items?.length
          }))
        }
      }
    });

  } catch (error) {
    console.error('❌ DB 테스트 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

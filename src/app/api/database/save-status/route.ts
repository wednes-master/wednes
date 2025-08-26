import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

export async function GET() {
  try {
    // 각 테이블의 데이터 개수 조회
    const noticesCount = await executeQuery('SELECT COUNT(*) as count FROM notices');
    const eventsCount = await executeQuery('SELECT COUNT(*) as count FROM events');
    const updatesCount = await executeQuery('SELECT COUNT(*) as count FROM updates');
    const gameContentsCount = await executeQuery('SELECT COUNT(*) as count FROM game_contents');
    const alarmsCount = await executeQuery('SELECT COUNT(*) as count FROM alarms');
    const marketItemsCount = await executeQuery('SELECT COUNT(*) as count FROM market_items');
    const auctionItemsCount = await executeQuery('SELECT COUNT(*) as count FROM auction_items');
    const marketItemDetailsCount = await executeQuery('SELECT COUNT(*) as count FROM market_item_details');
    const apiLogsCount = await executeQuery('SELECT COUNT(*) as count FROM api_logs');

    // 최근 저장된 데이터 조회
    const recentNotices = await executeQuery('SELECT title, created_at FROM notices ORDER BY created_at DESC LIMIT 5');
    const recentMarketItems = await executeQuery('SELECT name, current_min_price, created_at FROM market_items ORDER BY created_at DESC LIMIT 5');

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          notices: noticesCount[0]?.count || 0,
          events: eventsCount[0]?.count || 0,
          updates: updatesCount[0]?.count || 0,
          gameContents: gameContentsCount[0]?.count || 0,
          alarms: alarmsCount[0]?.count || 0,
          marketItems: marketItemsCount[0]?.count || 0,
          auctionItems: auctionItemsCount[0]?.count || 0,
          marketItemDetails: marketItemDetailsCount[0]?.count || 0,
          apiLogs: apiLogsCount[0]?.count || 0,
        },
        recent: {
          notices: recentNotices,
          marketItems: recentMarketItems,
        }
      }
    });
  } catch (error) {
    console.error('데이터베이스 저장 상태 조회 오류:', error);
    return NextResponse.json({ 
      success: false, 
      message: '데이터베이스 저장 상태 조회 오류',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

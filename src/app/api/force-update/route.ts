import { NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';
import { 
  getLostarkNotices, 
  getLostarkEvents, 
  getLostarkAlarms, 
  getLostarkGameCalendar
} from '@/app/lib/api';

export async function GET() {
  try {
    console.log('🔄 강제 업데이트 시작...');
    const startTime = Date.now();

    // 기존 데이터 삭제
    console.log('🗑️ 기존 데이터 삭제 중...');
    await executeQuery('DELETE FROM game_contents', []);
    await executeQuery('DELETE FROM notices', []);
    await executeQuery('DELETE FROM events', []);
    await executeQuery('DELETE FROM alarms', []);

    // 최신 데이터 수집
    console.log('📢 공지사항 수집 중...');
    await getLostarkNotices(50);

    console.log('🎉 이벤트 수집 중...');
    await getLostarkEvents(50);

    console.log('🔔 알람 수집 중...');
    await getLostarkAlarms(50);

    console.log('📅 게임 콘텐츠 수집 중...');
    await getLostarkGameCalendar();

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`✅ 강제 업데이트 완료! (소요시간: ${duration}초)`);

    return NextResponse.json({
      success: true,
      message: '강제 업데이트 완료',
      duration: `${duration}초`
    });

  } catch (error) {
    console.error('❌ 강제 업데이트 오류:', error);
    return NextResponse.json({
      success: false,
      message: '강제 업데이트 실패',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

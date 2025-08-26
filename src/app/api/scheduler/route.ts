import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';

// 스케줄러 상태 확인
export async function GET() {
  try {
    // 최근 배치 수집 시간 확인
    const lastBatch = await executeQuery(
      'SELECT created_at FROM api_logs WHERE endpoint = "/api/batch/collect" ORDER BY created_at DESC LIMIT 1'
    );

    const lastBatchTime = lastBatch[0]?.created_at;
    const now = new Date();
    const timeDiff = lastBatchTime ? Math.round((now.getTime() - new Date(lastBatchTime).getTime()) / (1000 * 60)) : null;

    // 1시간(60분) 경과 여부 확인
    const shouldRun = timeDiff === null || timeDiff >= 60;

    return NextResponse.json({
      success: true,
      data: {
        lastBatchTime,
        timeDiffMinutes: timeDiff,
        shouldRun,
        nextRunTime: lastBatchTime ? new Date(new Date(lastBatchTime).getTime() + 60 * 60 * 1000) : null
      }
    });

  } catch (error) {
    console.error('스케줄러 상태 확인 오류:', error);
    return NextResponse.json({
      success: false,
      message: '스케줄러 상태 확인 실패'
    }, { status: 500 });
  }
}

// 스케줄러 실행 (외부에서 호출)
export async function POST() {
  try {
    // 최근 배치 수집 시간 확인
    const lastBatch = await executeQuery(
      'SELECT created_at FROM api_logs WHERE endpoint = "/api/batch/collect" ORDER BY created_at DESC LIMIT 1'
    );

    const lastBatchTime = lastBatch[0]?.created_at;
    const now = new Date();
    const timeDiff = lastBatchTime ? Math.round((now.getTime() - new Date(lastBatchTime).getTime()) / (1000 * 60)) : null;

    // 1시간 미만이면 실행하지 않음
    if (timeDiff !== null && timeDiff < 60) {
      return NextResponse.json({
        success: false,
        message: '아직 실행 시간이 되지 않았습니다',
        data: {
          lastBatchTime,
          timeDiffMinutes: timeDiff,
          nextRunTime: new Date(new Date(lastBatchTime).getTime() + 60 * 60 * 1000)
        }
      });
    }

    // 배치 수집 실행
    console.log('🕐 스케줄러: 배치 수집 실행 시작...');
    
    const batchResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/batch/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (batchResponse.ok) {
      const result = await batchResponse.json();
      console.log('✅ 스케줄러: 배치 수집 완료');
      
      return NextResponse.json({
        success: true,
        message: '스케줄러 배치 수집 완료',
        data: result
      });
    } else {
      console.error('❌ 스케줄러: 배치 수집 실패');
      return NextResponse.json({
        success: false,
        message: '스케줄러 배치 수집 실패'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('스케줄러 실행 오류:', error);
    return NextResponse.json({
      success: false,
      message: '스케줄러 실행 실패',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

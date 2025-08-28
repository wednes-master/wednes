import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/app/lib/database';
import { 
  getLostarkNotices, 
  getLostarkEvents, 
  getLostarkAlarms, 
  getLostarkGameCalendar
} from '@/app/lib/api';

// 마켓 카테고리별 병렬 배치 수집 (최적화)
async function collectMarketData() {
  try {
    console.log('🔄 마켓 데이터 병렬 수집 중...');
    
    // 로스트아크 API에서 직접 데이터 가져오기
    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      throw new Error('LOSTARK_API_KEY가 설정되지 않았습니다.');
    }

    const categories = [
      { code: 50000, name: 'enhancement', filter: '융화' }, // 강화재료 (융화 포함만)
      { code: 60000, name: 'battle' },      // 배틀아이템
      { code: 70000, name: 'cooking' },     // 요리
      { code: 90000, name: 'estate' },      // 영지
    ];

    // 각 카테고리별로 병렬 처리 (전체 페이지)
    const categoryPromises = categories.map(async (category) => {
      try {
        console.log(`🔄 ${category.name} 카테고리 데이터 수집 중...`);
        
        // 전체 페이지를 순차적으로 조회
        let allItems: any[] = [];
        let pageNo = 1;
        const pageSize = 10; // API가 10개만 반환
        
        while (true) {
          const payload = {
            Sort: 'GRADE',
            CategoryCode: category.code,
            CharacterClass: '',
            ItemTier: null,
            ItemGrade: '',
            ItemName: category.filter || '', // 50000 카테고리만 '융화' 필터 적용
            PageNo: pageNo,
            PageSize: pageSize,
            SortCondition: 'ASC',
          };

          const res = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Authorization': `bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            console.error(`❌ ${category.name} 카테고리 API 호출 실패:`, res.status);
            break;
          }

          const data = await res.json();
          const items = data.Items || [];
          
          if (items.length === 0) {
            break; // 더 이상 아이템이 없으면 종료
          }
          
          allItems = allItems.concat(items);
          console.log(`📦 ${category.name} 페이지 ${pageNo}: ${items.length}개 아이템`);
          
          // 마지막 페이지인지 확인 (10개 미만이면 마지막 페이지)
          if (items.length < pageSize) {
            break;
          }
          
          pageNo++;
        }
        
        if (allItems.length > 0) {
          console.log(`📦 ${category.name} 카테고리에서 총 ${allItems.length}개 아이템 발견`);
          
          let processed = 0;
          for (const item of allItems) {
            await processMarketItem(item, category.code);
            processed++;
          }
          
          console.log(`✅ ${category.name} 카테고리 처리 완료 (총 ${processed}개 아이템)`);
          return processed;
        }
      } catch (error) {
        console.error(`❌ ${category.name} 카테고리 수집 오류:`, error);
      }
      return 0;
    });

    // 모든 카테고리 병렬 처리 완료 대기
    const results = await Promise.all(categoryPromises);
    const totalProcessed = results.reduce((sum, count) => sum + count, 0);
    
    console.log(`✅ 전체 마켓 병렬 처리 완료 (총 ${totalProcessed}개 아이템)`);
    
  } catch (error) {
    console.error('❌ 마켓 데이터 수집 오류:', error);
  }
}

// 마켓 아이템 처리 (신규 아이템은 INSERT, 기존 아이템은 시세만 UPDATE)
async function processMarketItem(item: Record<string, unknown>, categoryCode: number) {
  try {
    // 디버깅: 아이템 정보 로깅
    console.log(`🔍 아이템 처리 중: ${item.Name} (ID: ${item.Id})`);
    console.log(`💰 가격 정보: CurrentMinPrice=${item.CurrentMinPrice}, RecentPrice=${item.RecentPrice}, YDayAvgPrice=${item.YDayAvgPrice}`);
    
    // 기존 데이터 확인 (item_id와 name으로 정확히 매칭)
    const existing = await executeQuery(
      'SELECT id, name, current_min_price FROM market_items WHERE item_id = ? AND name = ?',
      [item.Id, item.Name]
    );

    if (existing.length > 0) {
      // 기존 아이템이 있으면 시세만 업데이트
      const oldPrice = (existing[0] as { current_min_price: number }).current_min_price;
      console.log(`📊 기존 가격: ${oldPrice} → 새 가격: ${item.CurrentMinPrice}`);
      
      await executeQuery(
        `UPDATE market_items 
         SET current_min_price = ?, recent_price = ?, avg_price = ?, updated_at = NOW()
         WHERE item_id = ? AND name = ?`,
        [
          item.CurrentMinPrice,
          item.RecentPrice,
          item.YDayAvgPrice,
          item.Id,
          item.Name
        ]
      );
      console.log(`✅ 가격 업데이트 완료: ${item.Name}`);
    } else {
      // 새 아이템이면 전체 데이터 삽입
      await executeQuery(
        `INSERT INTO market_items 
         (item_id, name, grade, icon, current_min_price, recent_price, avg_price, category_code, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          item.Id,
          item.Name,
          item.Grade,
          item.Icon,
          item.CurrentMinPrice,
          item.RecentPrice,
          item.YDayAvgPrice,
          categoryCode
        ]
      );
      console.log(`➕ 새 아이템 추가: ${item.Name}`);
    }
  } catch (error) {
    console.error(`❌ 아이템 처리 오류 (${item.Name}):`, error);
  }
}

// 스케줄러 상태 확인
export async function GET() {
  try {
    // 최근 배치 수집 시간 확인
    const lastBatch = await executeQuery(
      'SELECT created_at FROM api_logs WHERE endpoint = "/api/batch/collect" ORDER BY created_at DESC LIMIT 1',
      []
    );

    const lastBatchTime = (lastBatch[0] as { created_at: string } | undefined)?.created_at;
    const now = new Date();
    const timeDiff = lastBatchTime ? Math.round((now.getTime() - new Date(lastBatchTime).getTime()) / (1000 * 60)) : null;

    // 10분 경과 여부 확인
    const shouldRun = timeDiff === null || timeDiff >= 10;

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
      'SELECT created_at FROM api_logs WHERE endpoint = "/api/batch/collect" ORDER BY created_at DESC LIMIT 1',
      []
    );

    const lastBatchTime = (lastBatch[0] as { created_at: string } | undefined)?.created_at;
    const now = new Date();
    const timeDiff = lastBatchTime ? Math.round((now.getTime() - new Date(lastBatchTime).getTime()) / (1000 * 60)) : null;

    // 10분 미만이면 실행하지 않음 (임시로 주석 처리)
    /*
    if (timeDiff !== null && timeDiff < 10) {
      return NextResponse.json({
        success: false,
        message: '아직 실행 시간이 되지 않았습니다',
        data: {
          lastBatchTime,
          timeDiffMinutes: timeDiff,
          nextRunTime: lastBatchTime ? new Date(new Date(lastBatchTime).getTime() + 10 * 60 * 1000) : null
        }
      });
    }
    */

    // 배치 수집 실행 (직접 함수 호출)
    console.log('🕐 스케줄러: 배치 수집 실행 시작...');
    const startTime = Date.now();

    try {
      // 1. 로스트아크 공식 API 데이터 수집
      console.log('📢 공지사항 수집 중...');
      await getLostarkNotices(50);

      console.log('🎉 이벤트 수집 중...');
      await getLostarkEvents(50);

      console.log('🔔 알람 수집 중...');
      await getLostarkAlarms(50);

      console.log('📅 게임 콘텐츠 수집 중...');
      await getLostarkGameCalendar();

      // 2. 마켓 데이터 수집 (신규 아이템 추가 + 시세 업데이트)
      console.log('🛒 마켓 데이터 수집 중...');
      await collectMarketData();

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      console.log(`✅ 스케줄러: 배치 수집 완료! (소요시간: ${duration}초)`);

      // 배치 수집 로그 저장
      await executeQuery(
        'INSERT INTO api_logs (endpoint, method, status_code, response_time, created_at) VALUES (?, ?, ?, ?, NOW())',
        ['/api/batch/collect', 'POST', 200, duration * 1000]
      );

      return NextResponse.json({
        success: true,
        message: '스케줄러 배치 수집 완료',
        duration: `${duration}초`
      });

    } catch (batchError) {
      console.error('❌ 스케줄러: 배치 수집 중 오류:', batchError);
      
      // 오류 로그 저장
      try {
        await executeQuery(
          'INSERT INTO api_logs (endpoint, method, status_code, response_time, error_message, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          ['/api/batch/collect', 'POST', 500, 0, batchError instanceof Error ? batchError.message : 'Unknown error']
        );
      } catch (logError) {
        console.error('로그 저장 오류:', logError);
      }

      return NextResponse.json({
        success: false,
        message: '스케줄러 배치 수집 실패',
        error: batchError instanceof Error ? batchError.message : 'Unknown error'
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

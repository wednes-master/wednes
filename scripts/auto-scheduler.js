// scripts/auto-scheduler.js
const https = require('https');
const http = require('http');

const SCHEDULER_URL = process.env.SCHEDULER_URL || 'http://localhost:3001/api/scheduler';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5분마다 체크

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = client.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function checkAndRunScheduler() {
  try {
    console.log(`[${new Date().toISOString()}] 🔍 스케줄러 상태 확인 중...`);
    
    // 스케줄러 상태 확인
    const statusResponse = await makeRequest(SCHEDULER_URL, 'GET');
    
    if (statusResponse.status === 200 && statusResponse.data.success) {
      const { lastBatchTime, timeDiffMinutes, shouldRun, nextRunTime } = statusResponse.data.data;
      
      console.log(`📊 마지막 배치 수집: ${lastBatchTime || '없음'}`);
      console.log(`⏰ 경과 시간: ${timeDiffMinutes || 0}분`);
      console.log(`🔄 실행 필요: ${shouldRun ? '예' : '아니오'}`);
      
      if (nextRunTime) {
        console.log(`⏭️ 다음 실행 예정: ${nextRunTime}`);
      }
      
      // 1시간이 지났으면 배치 수집 실행
      if (shouldRun) {
        console.log('🚀 배치 수집 실행 중...');
        
        const runResponse = await makeRequest(SCHEDULER_URL, 'POST');
        
        if (runResponse.status === 200 && runResponse.data.success) {
          console.log('✅ 배치 수집 완료!');
          console.log(`📈 결과: ${JSON.stringify(runResponse.data.data)}`);
        } else {
          console.log('❌ 배치 수집 실패 또는 아직 실행 시간이 아님');
          if (runResponse.data.message) {
            console.log(`💬 메시지: ${runResponse.data.message}`);
          }
        }
      } else {
        console.log('⏳ 아직 실행 시간이 되지 않았습니다.');
      }
    } else {
      console.error('❌ 스케줄러 상태 확인 실패:', statusResponse.data);
    }
    
  } catch (error) {
    console.error(`❌ 스케줄러 실행 오류: ${error.message}`);
  }
}

// 메인 실행 함수
async function main() {
  console.log('🕐 자동 스케줄러 시작...');
  console.log(`🔗 스케줄러 URL: ${SCHEDULER_URL}`);
  console.log(`⏱️ 체크 간격: ${CHECK_INTERVAL / 1000}초`);
  console.log('---');
  
  // 즉시 한 번 실행
  await checkAndRunScheduler();
  
  // 주기적으로 실행
  setInterval(checkAndRunScheduler, CHECK_INTERVAL);
}

// 스크립트 실행
main().catch(console.error);

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('\n🛑 자동 스케줄러 종료 중...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 자동 스케줄러 종료 중...');
  process.exit(0);
});

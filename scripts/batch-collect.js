// scripts/batch-collect.js
const https = require('https');
const http = require('http');

const url = process.env.BATCH_URL || 'http://localhost:3001/api/batch/collect';

function runBatchCollect() {
  const client = url.startsWith('https') ? https : http;
  
  const req = client.request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`[${new Date().toISOString()}] 배치 수집 완료:`, JSON.parse(data));
    });
  });

  req.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] 배치 수집 오류:`, error);
  });

  req.end();
}

// 스크립트 실행
runBatchCollect();

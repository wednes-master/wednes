import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/app/lib/database';

export async function GET() {
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      return NextResponse.json({ 
        success: true, 
        message: '데이터베이스 연결 성공!' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: '데이터베이스 연결 실패' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('데이터베이스 테스트 오류:', error);
    return NextResponse.json({ 
      success: false, 
      message: '데이터베이스 연결 오류',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

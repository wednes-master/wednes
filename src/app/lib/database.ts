import mysql from 'mysql2/promise';

// 데이터베이스 연결 설정 (성능 최적화)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wednes',
  charset: process.env.DB_CHARSET || 'utf8mb4',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_MAX || '20'), // 연결 수 증가
  queueLimit: 0,
  // 성능 최적화 옵션 추가
  multipleStatements: false,
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
};

// 연결 풀 생성
const pool = mysql.createPool(dbConfig);

// 데이터 검증 함수 - undefined 값을 null로 변환
function sanitizeData(data: unknown): unknown {
  if (data === undefined) return null;
  if (data === null) return null;
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item));
    } else {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = sanitizeData(value);
      }
      return sanitized;
    }
  }
  return data;
}

// 데이터베이스 연결 테스트
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL 연결 성공!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL 연결 실패:', error);
    return false;
  }
}

// 쿼리 실행 함수
export async function executeQuery<T = unknown>(query: string, params?: unknown[]): Promise<T[]> {
  try {
    // undefined 값을 null로 변환
    const safeParams = params?.map(param => param === undefined ? null : param);
    const [rows] = await pool.execute(query, safeParams);
    return rows as T[];
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    throw error;
  }
}

// 단일 행 조회
export async function executeQuerySingle<T = unknown>(query: string, params?: unknown[]): Promise<T | null> {
  try {
    // undefined 값을 null로 변환
    const safeParams = params?.map(param => param === undefined ? null : param);
    const [rows] = await pool.execute(query, safeParams);
    const results = rows as T[];
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('쿼리 실행 오류:', error);
    throw error;
  }
}

// 삽입 함수
export async function insertData(table: string, data: Record<string, unknown>): Promise<number> {
  try {
    // 데이터 검증
    const sanitizedData = sanitizeData(data) as Record<string, unknown>;
    const columns = Object.keys(sanitizedData);
    const values = Object.values(sanitizedData);
    const placeholders = columns.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.execute(query, values);
    
    return (result as { insertId: number }).insertId;
  } catch (error) {
    console.error('데이터 삽입 오류:', error);
    throw error;
  }
}

// 업데이트 함수
export async function updateData(table: string, data: Record<string, unknown>, where: Record<string, unknown>): Promise<number> {
  try {
    const setColumns = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const whereColumns = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    
    const query = `UPDATE ${table} SET ${setColumns} WHERE ${whereColumns}`;
    // undefined 값을 null로 변환
    const values = [
      ...Object.values(data).map(value => value === undefined ? null : value),
      ...Object.values(where).map(value => value === undefined ? null : value)
    ];
    
    const [result] = await pool.execute(query, values);
    return (result as { affectedRows: number }).affectedRows;
  } catch (error) {
    console.error('데이터 업데이트 오류:', error);
    throw error;
  }
}

// 삭제 함수
export async function deleteData(table: string, where: Record<string, unknown>): Promise<number> {
  try {
    const whereColumns = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const query = `DELETE FROM ${table} WHERE ${whereColumns}`;
    // undefined 값을 null로 변환
    const values = Object.values(where).map(value => value === undefined ? null : value);
    
    const [result] = await pool.execute(query, values);
    return (result as { affectedRows: number }).affectedRows;
  } catch (error) {
    console.error('데이터 삭제 오류:', error);
    throw error;
  }
}

export default pool;

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mission_control',
  user: process.env.DB_USER || 'alfred',
  password: process.env.DB_PASSWORD || 'AlfredDB2026Secure',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[DB] Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('[DB] Query error:', error);
    throw error;
  }
}

export default pool;

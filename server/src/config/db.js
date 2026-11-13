import pg from 'pg';
import { env } from './env.js';

pg.types.setTypeParser(20, (v) => parseInt(v, 10));

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase ke liye zaroori
  max: 1,                              // serverless ke liye chota pool
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,      // hang hone ke bajaye jaldi error de
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export function closePool() {
  return pool.end();
}

export async function checkConnection() {
  await pool.query('SELECT 1');
}
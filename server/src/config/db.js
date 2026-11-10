import pg from 'pg';
import { env } from './env.js';

// DATE/TIMESTAMP ko string ki jagah aham types mein parse karne ki zaroorat nahi:
// TIMESTAMPTZ pg se Date object ban kar aata hai, jo JSON mein ISO string ban jata hai.
// COUNT(*) bigint hota hai, usay number bana lete hain.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

// Aam query: const { rows } = await query('SELECT ...', [params])
export function query(text, params) {
  return pool.query(text, params);
}

// Transaction helper: callback ko ek client milta hai.
// Callback poora ho to COMMIT, error aaye to ROLLBACK aur error dobara phenk diya jata hai.
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

// Server band hone par connections saaf karne ke liye
export function closePool() {
  return pool.end();
}

// Startup par connection check
export async function checkConnection() {
  await pool.query('SELECT 1');
}
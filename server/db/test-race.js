import 'dotenv/config';
import pg from 'pg';

const CONCURRENT = 20;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: CONCURRENT,
});

const insertSql = `
  INSERT INTO bookings (customer_id, staff_id, service_id, start_time, end_time, notes)
  VALUES ($1, $2, $3, $4, $5, 'test-race')
  RETURNING id
`;

// Ek booking try karta hai: kamyab ho to 'ok', overlap ho to 'conflict'
async function tryBook(customerId, staffId, serviceId, start, end) {
  try {
    await pool.query(insertSql, [customerId, staffId, serviceId, start, end]);
    return 'ok';
  } catch (err) {
    if (err.code === '23P01') return 'conflict'; // exclusion_violation
    throw err;
  }
}

function count(results, label) {
  return results.filter((r) => r === label).length;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL set nahi hai. .env file check karein.');
    process.exit(1);
  }

  // Seed ka data uthayein
  const { rows: staffRows } = await pool.query('SELECT id FROM staff ORDER BY id LIMIT 1');
  const { rows: serviceRows } = await pool.query('SELECT id FROM services ORDER BY id LIMIT 1');
  const { rows: customerRows } = await pool.query(
    "SELECT id FROM users WHERE role = 'customer' ORDER BY id LIMIT 1"
  );

  if (!staffRows[0] || !serviceRows[0] || !customerRows[0]) {
    console.error('Pehle "npm run seed" chalayen.');
    process.exit(1);
  }

  const staffId = staffRows[0].id;
  const serviceId = serviceRows[0].id;
  const customerId = customerRows[0].id;

  // Door ka future time, taake asli data se na takraye
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() + 5, 0, 15);
  start.setUTCHours(6, 0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  let passed = true;

  try {
    await pool.query("DELETE FROM bookings WHERE notes = 'test-race'");

    // Test 1: ek hi slot par 20 requests ek saath
    console.log(`Test 1: ek hi slot par ${CONCURRENT} requests ek saath...`);
    const results = await Promise.all(
      Array.from({ length: CONCURRENT }, () => tryBook(customerId, staffId, serviceId, start, end))
    );
    const ok = count(results, 'ok');
    const conflict = count(results, 'conflict');
    console.log(`  kamyab: ${ok}, reject: ${conflict}`);
    if (ok !== 1 || conflict !== CONCURRENT - 1) {
      console.log('  FAIL: sirf 1 booking kamyab honi chahiye thi.');
      passed = false;
    } else {
      console.log('  PASS');
    }

    // Test 2: aadha overlap (15 minute baad shuru) reject hona chahiye
    console.log('Test 2: partial overlap wali booking...');
    const overlapStart = new Date(start.getTime() + 15 * 60 * 1000);
    const overlapEnd = new Date(overlapStart.getTime() + 30 * 60 * 1000);
    const r2 = await tryBook(customerId, staffId, serviceId, overlapStart, overlapEnd);
    if (r2 === 'conflict') {
      console.log('  PASS');
    } else {
      console.log('  FAIL: overlap reject hona chahiye tha.');
      passed = false;
    }

    // Test 3: bilkul agla slot (end_time par shuru) allowed hona chahiye
    console.log('Test 3: back-to-back slot (touching, overlap nahi)...');
    const nextEnd = new Date(end.getTime() + 30 * 60 * 1000);
    const r3 = await tryBook(customerId, staffId, serviceId, end, nextEnd);
    if (r3 === 'ok') {
      console.log('  PASS');
    } else {
      console.log('  FAIL: back-to-back slot allowed hona chahiye tha.');
      passed = false;
    }

    // Test 4: cancel hone ke baad wahi slot dobara book ho sakta hai
    console.log('Test 4: cancel ke baad slot dobara free...');
    await pool.query(
      "UPDATE bookings SET status = 'cancelled' WHERE notes = 'test-race' AND start_time = $1",
      [start]
    );
    const r4 = await tryBook(customerId, staffId, serviceId, start, end);
    if (r4 === 'ok') {
      console.log('  PASS');
    } else {
      console.log('  FAIL: cancelled slot dobara book hona chahiye tha.');
      passed = false;
    }
  } finally {
    await pool.query("DELETE FROM bookings WHERE notes = 'test-race'");
    await pool.end();
  }

  console.log(passed ? '\nSab tests PASS.' : '\nKuch tests FAIL hue.');
  process.exitCode = passed ? 0 : 1;
}

main().catch((err) => {
  console.error('Test chalne mein error:', err.message);
  process.exit(1);
});
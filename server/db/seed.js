import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { addDays, addMinutes, todayStr, weekdayOf, zonedToUtc } from '../src/utils/time.js';

const TARGETS = { admins: 1, staff: 3, services: 5, customers: 15, appointments: 40 };
const DEMO_STAFF = [
  { name: 'Ayesha Khan', email: 'ayesha@example.com', bio: 'Senior stylist and colour specialist.' },
  { name: 'Bilal Ahmed', email: 'bilal@example.com', bio: 'Barber specializing in men’s grooming.' },
  { name: 'Sara Malik', email: 'sara@example.com', bio: 'Skin care and styling specialist.' },
];
const DEMO_SERVICES = [
  { name: 'Haircut', description: 'Basic haircut and styling', durationMin: 30, priceCents: 80000 },
  { name: 'Beard Trim', description: 'Beard shaping and trim', durationMin: 30, priceCents: 50000 },
  { name: 'Facial', description: 'Deep cleansing facial', durationMin: 60, priceCents: 250000 },
  { name: 'Hair Colour', description: 'Full hair colour', durationMin: 90, priceCents: 400000 },
  { name: 'Hair Spa', description: 'Nourishing hair treatment', durationMin: 60, priceCents: 180000 },
];
const DAYS_OPEN = [1, 2, 3, 4, 5, 6];
const SEED_MARKER = 'DEMO-SEED:APPT:';
const PAGE_SIZE_MINUTES = 30;

function assertDemoPassword() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Set DEMO_PASSWORD to a password with at least 8 characters, including a letter and a number.');
  }
  return password;
}

async function findUser(client, email) {
  const { rows } = await client.query(
    'SELECT id, role FROM users WHERE lower(email) = lower($1)',
    [email]
  );
  return rows[0] || null;
}

async function ensureUser(client, user, passwordHash) {
  const existing = await findUser(client, user.email);
  if (existing) {
    if (existing.role !== user.role) {
      throw new Error(`Demo account ${user.email} already exists with a different role.`);
    }
    return { id: existing.id, created: false };
  }

  const { rows } = await client.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
    [user.name, user.email, passwordHash, user.role]
  );
  return { id: rows[0].id, created: true };
}

async function countRows(client, table, condition = '') {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count FROM ${table} ${condition}`
  );
  return rows[0].count;
}

async function ensureDemoAccounts(client, passwordHash) {
  const admins = await countRows(client, 'users', "WHERE role = 'admin'");
  if (admins < TARGETS.admins) {
    await ensureUser(client, { name: 'Admin', email: 'admin@example.com', role: 'admin' }, passwordHash);
  }

  let serviceCount = await countRows(client, 'services');
  for (const service of DEMO_SERVICES) {
    if (serviceCount >= TARGETS.services) break;

    const { rows: found } = await client.query(
      'SELECT id FROM services WHERE lower(name) = lower($1) ORDER BY id LIMIT 1',
      [service.name]
    );
    if (found[0]) continue;

    await client.query(
      `INSERT INTO services (name, description, duration_min, price_cents)
       VALUES ($1, $2, $3, $4)`,
      [service.name, service.description, service.durationMin, service.priceCents]
    );
    serviceCount++;
  }

  let staffCount = await countRows(client, 'staff');
  for (const demoStaff of DEMO_STAFF) {
    if (staffCount >= TARGETS.staff) break;

    const user = await ensureUser(client, { ...demoStaff, role: 'staff' }, passwordHash);
    const profile = await client.query('SELECT id FROM staff WHERE user_id = $1', [user.id]);
    if (!profile.rows[0]) {
      const { rows } = await client.query(
        'INSERT INTO staff (user_id, bio) VALUES ($1, $2)',
        [user.id, demoStaff.bio]
      );
      const staffId = rows[0].id;
      const { rows: services } = await client.query(
        'SELECT id FROM services WHERE active = TRUE ORDER BY id'
      );
      for (const service of services) {
        await client.query(
          'INSERT INTO staff_services (staff_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [staffId, service.id]
        );
      }
      for (const weekday of DAYS_OPEN) {
        await client.query(
          `INSERT INTO staff_hours (staff_id, weekday, start_time, end_time)
           VALUES ($1, $2, '10:00', '18:00') ON CONFLICT (staff_id, weekday) DO NOTHING`,
          [staffId, weekday]
        );
      }
      staffCount++;
    }
  }

  let customerCount = await countRows(client, 'users', "WHERE role = 'customer'");
  let suffix = 1;
  while (customerCount < TARGETS.customers) {
    const email = `demo.customer${String(suffix).padStart(2, '0')}@example.com`;
    suffix++;
    const existing = await findUser(client, email);
    if (existing) {
      if (existing.role !== 'customer') continue;
      customerCount++;
      continue;
    }
    await ensureUser(
      client,
      { name: `Demo Customer ${String(suffix - 1).padStart(2, '0')}`, email, role: 'customer' },
      passwordHash
    );
    customerCount++;
  }
}

function overlaps(start, end, otherStart, otherEnd) {
  return start < otherEnd && otherStart < end;
}

async function createDemoBookings(client) {
  const { rows: existingMarkers } = await client.query(
    `SELECT notes FROM bookings WHERE notes LIKE $1`,
    [`${SEED_MARKER}%`]
  );
  const existingIds = new Set(
    existingMarkers.map(({ notes }) => Number(notes.slice(SEED_MARKER.length))).filter(Number.isInteger)
  );
  const { rows: unseededRows } = await client.query(
    'SELECT COUNT(*)::int AS count FROM bookings WHERE notes IS NULL OR notes NOT LIKE $1',
    [`${SEED_MARKER}%`]
  );
  const desiredDemoCount = Math.max(0, TARGETS.appointments - unseededRows[0].count);
  const missingIds = Array.from({ length: desiredDemoCount }, (_, index) => index + 1)
    .filter((id) => !existingIds.has(id));

  if (missingIds.length === 0) return 0;

  const { rows: customers } = await client.query(
    "SELECT id FROM users WHERE role = 'customer' ORDER BY id"
  );
  const { rows: schedules } = await client.query(
    `SELECT s.id AS staff_id, sv.id AS service_id, sv.duration_min,
            h.weekday, h.start_time::text AS opens, h.end_time::text AS closes
       FROM staff s
       JOIN staff_services ss ON ss.staff_id = s.id
       JOIN services sv ON sv.id = ss.service_id AND sv.active = TRUE
       JOIN staff_hours h ON h.staff_id = s.id
      WHERE s.active = TRUE
      ORDER BY s.id, sv.id, h.weekday`
  );
  const { rows: bookings } = await client.query(
    'SELECT staff_id, start_time, end_time FROM bookings'
  );
  const busy = bookings.map((booking) => ({
    staffId: booking.staff_id,
    start: new Date(booking.start_time),
    end: new Date(booking.end_time),
  }));
  const today = todayStr();
  let customerIndex = 0;
  let created = 0;

  for (const markerId of missingIds) {
    const isPast = markerId <= 10;
    const status = isPast
      ? markerId <= 4 ? 'completed' : markerId <= 7 ? 'no_show' : 'cancelled'
      : 'confirmed';
    const offsets = isPast
      ? Array.from({ length: 60 }, (_, index) => -60 + index)
      : Array.from({ length: 60 }, (_, index) => index + 1);
    let chosen = null;

    for (const offset of offsets) {
      const date = addDays(today, offset);
      const weekday = weekdayOf(date);
      for (const schedule of schedules) {
        if (schedule.weekday !== weekday) continue;

        const [openHour, openMinute] = schedule.opens.slice(0, 5).split(':').map(Number);
        const [closeHour, closeMinute] = schedule.closes.slice(0, 5).split(':').map(Number);
        const open = openHour * 60 + openMinute;
        const close = closeHour * 60 + closeMinute;
        for (let minute = open; minute + schedule.duration_min <= close; minute += PAGE_SIZE_MINUTES) {
          const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
          const start = zonedToUtc(date, time);
          const end = addMinutes(start, schedule.duration_min);
          if (isPast ? start >= new Date() : start <= new Date()) continue;
          if (busy.some((entry) => entry.staffId === schedule.staff_id && overlaps(start, end, entry.start, entry.end))) continue;
          chosen = { ...schedule, date, time, start, end };
          break;
        }
        if (chosen) break;
      }
      if (chosen) break;
    }

    if (!chosen) {
      throw new Error(`Could not find a non-conflicting ${isPast ? 'past' : 'future'} slot for demo booking ${markerId}. No seed changes were committed.`);
    }

    const customer = customers[customerIndex % customers.length];
    customerIndex++;
    await client.query(
      `INSERT INTO bookings (customer_id, staff_id, service_id, start_time, end_time, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        customer.id,
        chosen.staff_id,
        chosen.service_id,
        chosen.start,
        chosen.end,
        status,
        `${SEED_MARKER}${String(markerId).padStart(2, '0')}`,
      ]
    );
    busy.push({ staffId: chosen.staff_id, start: chosen.start, end: chosen.end });
    created++;
  }

  return created;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL set nahi hai. .env file check karein.');
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED_IN_PRODUCTION !== 'true') {
    throw new Error('Demo seeding is disabled in production unless ALLOW_DEMO_SEED_IN_PRODUCTION=true.');
  }

  const passwordHash = await bcrypt.hash(assertDemoPassword(), 10);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const dryRun = process.argv.includes('--dry-run');
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('appointment-booking-demo-seed'))");
    await ensureDemoAccounts(client, passwordHash);
    const createdBookings = await createDemoBookings(client);

    const { rows: summary } = await client.query(`
      SELECT (SELECT COUNT(*)::int FROM users WHERE role='admin') AS admins,
             (SELECT COUNT(*)::int FROM staff) AS staff,
             (SELECT COUNT(*)::int FROM services) AS services,
             (SELECT COUNT(*)::int FROM users WHERE role='customer') AS customers,
             (SELECT COUNT(*)::int FROM bookings) AS bookings,
             (SELECT COUNT(*)::int FROM bookings WHERE notes LIKE $1) AS demo_bookings
    `, [`${SEED_MARKER}%`]);

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log('Dry run complete; all database changes were rolled back.');
    } else {
      await client.query('COMMIT');
      console.log('Additive demo seed complete. Existing records were preserved.');
    }
    console.log(JSON.stringify({ ...summary[0], demoBookingsAdded: createdBookings }));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Demo seed failed:', error.message);
  process.exitCode = 1;
});

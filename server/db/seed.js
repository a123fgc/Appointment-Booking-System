import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

let PASSWORD = 'password123';

let USERS = [
  { name: 'Admin', email: 'admin@example.com', role: 'admin' },
  { name: 'Ayesha Khan', email: 'ayesha@example.com', role: 'staff' },
  { name: 'Bilal Ahmed', email: 'bilal@example.com', role: 'staff' },
  { name: 'Sara Malik', email: 'sara@example.com', role: 'staff' },
  { name: 'Ali Raza', email: 'ali@example.com', role: 'customer' },
  { name: 'Hina Shah', email: 'hina@example.com', role: 'customer' },
];

const SERVICES = [
  { name: 'Haircut', description: 'Basic haircut aur styling', duration_min: 30, price_cents: 80000 },
  { name: 'Beard Trim', description: 'Beard ki shaping aur trim', duration_min: 20, price_cents: 50000 },
  { name: 'Facial', description: 'Deep cleansing facial', duration_min: 60, price_cents: 250000 },
  { name: 'Hair Colour', description: 'Poore baalon ka colour', duration_min: 90, price_cents: 400000 },
];

// staff email -> kaun si services deta hai (SERVICES ke naam)
const STAFF_SERVICES = {
  'ayesha@example.com': ['Haircut', 'Facial', 'Hair Colour'],
  'bilal@example.com': ['Haircut', 'Beard Trim'],
  'sara@example.com': ['Facial', 'Hair Colour'],
};

const STAFF_BIO = {
  'ayesha@example.com': 'Senior stylist, 8 saal ka tajurba.',
  'bilal@example.com': 'Barber, men\'s grooming mein maahir.',
  'sara@example.com': 'Skin care aur colour specialist.',
};

// weekday: 0 = Sunday ... 6 = Saturday. Isme Peer se Hafta (1-6) 10:00 se 18:00
const WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const START = '10:00';
const END = '18:00';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL set nahi hai. .env file check karein.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Purana data saaf karein taake seed baar baar chala sakein
    await client.query(
      'TRUNCATE bookings, staff_hours, staff_services, staff, services, users RESTART IDENTITY CASCADE'
    );

    const hash = await bcrypt.hash(PASSWORD, 10);

    // Users
    const userIds = {};
    for (const u of USERS) {
      const { rows } = await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [u.name, u.email, hash, u.role]
      );
      userIds[u.email] = rows[0].id;
    }

    // Services
    const serviceIds = {};
    for (const s of SERVICES) {
      const { rows } = await client.query(
        'INSERT INTO services (name, description, duration_min, price_cents) VALUES ($1, $2, $3, $4) RETURNING id',
        [s.name, s.description, s.duration_min, s.price_cents]
      );
      serviceIds[s.name] = rows[0].id;
    }

    // Staff, unki services aur working hours
    for (const email of Object.keys(STAFF_SERVICES)) {
      const { rows } = await client.query(
        'INSERT INTO staff (user_id, bio) VALUES ($1, $2) RETURNING id',
        [userIds[email], STAFF_BIO[email]]
      );
      const staffId = rows[0].id;

      for (const serviceName of STAFF_SERVICES[email]) {
        await client.query(
          'INSERT INTO staff_services (staff_id, service_id) VALUES ($1, $2)',
          [staffId, serviceIds[serviceName]]
        );
      }

      for (const weekday of WORKING_DAYS) {
        await client.query(
          'INSERT INTO staff_hours (staff_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4)',
          [staffId, weekday, START, END]
        );
      }
    }

    await client.query('COMMIT');

    console.log('Seed kamyab.');
    console.log('Sab accounts ka password:', PASSWORD);
    console.log('  Admin:    admin@example.com');
    console.log('  Staff:    ayesha@example.com, bilal@example.com, sara@example.com');
    console.log('  Customer: ali@example.com, hina@example.com');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed fail hui:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
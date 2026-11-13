import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  addMinutes,
  overlaps,
  weekdayOf,
  zonedToUtc,
  dayRangeUtc,
  todayStr,
  addDays,
} from '../utils/time.js';

// Slots har 30 minute ke gap par shuru hote hain (10:00, 10:30, 11:00 ...)
export const SLOT_STEP_MIN = 30;

// Itne din aage tak hi booking ho sakti hai
export const MAX_DAYS_AHEAD = 60;

/* ---------- Chhote helpers ---------- */

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

function assertDateInRange(date) {
  if (date < todayStr() || date > addDays(todayStr(), MAX_DAYS_AHEAD)) {
    throw new HttpError(400, `Appointments can be booked ${MAX_DAYS_AHEAD} up to this date.`);
  }
}

async function getActiveService(db, serviceId) {
  const { rows } = await db.query(
    'SELECT id, name, duration_min FROM services WHERE id = $1 AND active = TRUE',
    [serviceId]
  );
  if (!rows[0]) throw new HttpError(404, 'Service not found or inactive');
  return rows[0];
}

/* ---------- Khali slots ---------- */

// Ek din ke saare khali slots. staffId na do to har us staff ke slots aate hain jo yeh service deta hai.
// Jawab: [{ time: '10:00', start, end, staffId, staffName }] (time aur naam ke hisab se tarteeb)
export async function getAvailableSlots({ serviceId, date, staffId }, db = pool) {
  const service = await getActiveService(db, serviceId);

  if (date < todayStr() || date > addDays(todayStr(), MAX_DAYS_AHEAD)) return [];

  // Us din kaam karne wala staff jo yeh service deta hai
  const { rows: staffRows } = await db.query(
    `SELECT s.id AS staff_id, u.name AS staff_name, h.start_time, h.end_time
       FROM staff s
       JOIN users u          ON u.id = s.user_id
       JOIN staff_services ss ON ss.staff_id = s.id AND ss.service_id = $1
       JOIN staff_hours h     ON h.staff_id = s.id AND h.weekday = $2
      WHERE s.active = TRUE
        AND ($3::int IS NULL OR s.id = $3)`,
    [service.id, weekdayOf(date), staffId ?? null]
  );

  if (staffRows.length === 0) return [];

  // Un sab ki us din ki confirmed bookings, ek hi query mein
  const range = dayRangeUtc(date);
  const { rows: busy } = await db.query(
    `SELECT staff_id, start_time, end_time
       FROM bookings
      WHERE status = 'confirmed'
        AND staff_id = ANY($1::int[])
        AND start_time < $3
        AND end_time > $2`,
    [staffRows.map((r) => r.staff_id), range.start, range.end]
  );

  const now = new Date();
  const slots = [];

  for (const st of staffRows) {
    const mine = busy.filter((b) => b.staff_id === st.staff_id);
    const open = toMinutes(st.start_time);
    const close = toMinutes(st.end_time);

    for (let m = open; m + service.duration_min <= close; m += SLOT_STEP_MIN) {
      const time = toHHMM(m);
      const start = zonedToUtc(date, time);
      const end = addMinutes(start, service.duration_min);

      if (start <= now) continue; // guzra hua waqt
      if (mine.some((b) => overlaps(start, end, b.start_time, b.end_time))) continue;

      slots.push({
        time,
        start: start.toISOString(),
        end: end.toISOString(),
        staffId: st.staff_id,
        staffName: st.staff_name,
      });
    }
  }

  slots.sort((a, b) => a.time.localeCompare(b.time) || a.staffName.localeCompare(b.staffName));
  return slots;
}

/* ---------- Ek khaas slot ki jaanch ---------- */

// Booking ya reschedule se pehle: kya yeh staff, is waqt, is service ke liye free hai?
// Theek ho to { service, start, end } wapas deta hai, warna HttpError phenkta hai.
// Reschedule mein excludeBookingId do, taake booking apne purane waqt se na takraye.
// Transaction mein chalana ho to db ki jagah client dein.
export async function checkSlot(
  { serviceId, staffId, date, time, excludeBookingId = null },
  db = pool
) {
  assertDateInRange(date);

  const service = await getActiveService(db, serviceId);
  const start = zonedToUtc(date, time);
  const end = addMinutes(start, service.duration_min);

  if (start <= new Date()) {
    throw new HttpError(400, 'This time is in the past. Please select a future time.');
  }

  // Staff active hai, yeh service deta hai, aur us din uske working hours hain?
  const { rows } = await db.query(
    `SELECT h.start_time, h.end_time
       FROM staff s
       JOIN staff_services ss ON ss.staff_id = s.id AND ss.service_id = $1
       JOIN staff_hours h     ON h.staff_id = s.id AND h.weekday = $3
      WHERE s.id = $2 AND s.active = TRUE`,
    [service.id, staffId, weekdayOf(date)]
  );

  if (!rows[0]) {
    throw new HttpError(400, 'Staff is not available on this date or does not provide this service');
  }

  const open = toMinutes(rows[0].start_time);
  const close = toMinutes(rows[0].end_time);
  const begin = toMinutes(time);

  if (begin < open || begin + service.duration_min > close) {
    throw new HttpError(400, 'This time is outside the staff\'s working hours');
  }
  if ((begin - open) % SLOT_STEP_MIN !== 0) {
    throw new HttpError(400, 'This time does not match any available appointment slot');
  }

  // Pehle se koi confirmed booking takra rahi hai?
  const { rows: clash } = await db.query(
    `SELECT 1 FROM bookings
      WHERE staff_id = $1
        AND status = 'confirmed'
        AND start_time < $3
        AND end_time > $2
        AND ($4::int IS NULL OR id <> $4)
      LIMIT 1`,
    [staffId, start, end, excludeBookingId]
  );

  if (clash.length > 0) {
    throw new HttpError(409, 'This time slot has just been booked by someone else. Please select another available slot.');
  }

  return { service, start, end };
}
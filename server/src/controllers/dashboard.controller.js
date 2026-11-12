import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { addDays, todayStr, zonedToUtc } from '../utils/time.js';

// GET /api/dashboard: sirf admin
// Jawab wahi hai jo frontend ki api/dashboard.js mein likha hai
export async function getDashboard(req, res) {
  const today = todayStr();
  const firstDay = addDays(today, -13); // aaj samet aakhri 14 din
  const chartStart = zonedToUtc(firstDay, '00:00');

  const [perDayRes, revenueRes, busiestRes, totalsRes, noShowRes] = await Promise.all([
    // Roz ki bookings (cancelled ke baghair)
    query(
      `SELECT to_char((start_time AT TIME ZONE $1)::date, 'YYYY-MM-DD') AS day,
              COUNT(*) AS count
         FROM bookings
        WHERE status <> 'cancelled' AND start_time >= $2
        GROUP BY 1`,
      [env.BUSINESS_TZ, chartStart]
    ),

    // Kamai: sirf completed bookings ki
    query(
      `SELECT COALESCE(SUM(sv.price_cents), 0)::bigint AS cents
         FROM bookings b
         JOIN services sv ON sv.id = b.service_id
        WHERE b.status = 'completed'`
    ),

    // Sab se busy staff (cancelled ke baghair)
    query(
      `SELECT u.name, COUNT(*) AS count
         FROM bookings b
         JOIN staff s ON s.id = b.staff_id
         JOIN users u ON u.id = s.user_id
        WHERE b.status <> 'cancelled'
        GROUP BY s.id, u.name
        ORDER BY count DESC, u.name
        LIMIT 1`
    ),

    query(
      `SELECT
         (SELECT COUNT(*) FROM bookings)                          AS bookings,
         (SELECT COUNT(*) FROM users WHERE role = 'customer')     AS customers,
         (SELECT COUNT(*) FROM staff WHERE active = TRUE)         AS staff`
    ),

    query(
      `SELECT CASE
                WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND(
                  COUNT(*) FILTER (WHERE status = 'no_show') * 100.0 / COUNT(*),
                  1
                )
              END AS rate
         FROM bookings
        WHERE status IN ('completed', 'no_show')`
    ),
  ]);

  // Jin dino mein booking nahi, unka count 0 dikhane ke liye
  const countByDay = new Map(perDayRes.rows.map((r) => [r.day, r.count]));
  const perDay = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(firstDay, i);
    return { day, count: countByDay.get(day) ?? 0 };
  });

  const busiest = busiestRes.rows[0]
    ? { name: busiestRes.rows[0].name, count: busiestRes.rows[0].count }
    : null;

  res.json({
    perDay,
    revenue: Math.round(revenueRes.rows[0].cents / 100), // rupees mein (paise nahi)
    busiest,
    noShowRate: Number(noShowRes.rows[0].rate),
    totals: totalsRes.rows[0],
  });
}
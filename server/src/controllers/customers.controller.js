import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  customerBookingsQuerySchema,
  customersListQuerySchema,
  idParamSchema,
} from '../validators/schemas.js';

const escapeLike = (value) => value.replace(/[\\%_]/g, (character) => `\\${character}`);

export async function listCustomers(req, res) {
  const { q, page, limit } = customersListQuerySchema.parse(req.query);
  const conditions = ["u.role = 'customer'"];
  const params = [];

  if (q) {
    params.push(`%${escapeLike(q)}%`);
    conditions.push(`(u.name ILIKE $1 OR u.email ILIKE $1)`);
  }

  const where = conditions.join(' AND ');
  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
    params
  );
  const total = countRows[0].total;
  const { rows: items } = await query(
    `SELECT u.id, u.name, u.email, u.created_at,
            (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id) AS booking_count
       FROM users u
      WHERE ${where}
      ORDER BY u.name, u.id
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );

  res.json({ items, total, page, limit });
}

export async function listCustomerBookings(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const { page, limit } = customerBookingsQuerySchema.parse(req.query);
  const { rows: customers } = await query(
    "SELECT id FROM users WHERE id = $1 AND role = 'customer'",
    [id]
  );

  if (!customers[0]) throw new HttpError(404, 'Customer nahi mila');

  const { rows: countRows } = await query(
    'SELECT COUNT(*) AS total FROM bookings WHERE customer_id = $1',
    [id]
  );
  const total = countRows[0].total;
  const { rows: items } = await query(
    `SELECT b.id, b.status, b.start_time, b.end_time, b.notes,
            b.service_id, sv.name AS service_name, sv.price_cents,
            b.staff_id, su.name AS staff_name
       FROM bookings b
       JOIN services sv ON sv.id = b.service_id
       JOIN staff s ON s.id = b.staff_id
       JOIN users su ON su.id = s.user_id
      WHERE b.customer_id = $1
      ORDER BY b.start_time DESC, b.id DESC
      LIMIT $2 OFFSET $3`,
    [id, limit, (page - 1) * limit]
  );

  res.json({ items, total, page, limit });
}

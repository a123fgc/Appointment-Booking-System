import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  serviceCreateSchema,
  serviceUpdateSchema,
  idParamSchema,
} from '../validators/schemas.js';

// Database row ko frontend ke format mein badalta hai
function toService(r) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    durationMin: r.duration_min,
    priceCents: r.price_cents,
    active: r.active,
  };
}

const COLUMNS = 'id, name, description, duration_min, price_cents, active';

// GET /api/services: sab ke liye, sirf active services (booking page ke liye)
export async function listServices(req, res) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM services WHERE active = TRUE ORDER BY name`
  );
  res.json({ items: rows.map(toService) });
}

// GET /api/services/all: sirf admin, band ki hui services bhi
export async function listAllServices(req, res) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM services ORDER BY active DESC, name`);
  res.json({ items: rows.map(toService) });
}

// GET /api/services/:id
export async function getService(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const { rows } = await query(`SELECT ${COLUMNS} FROM services WHERE id = $1`, [id]);

  const service = rows[0];
  // Band ki hui service sirf admin ko dikhti hai
  if (!service || (!service.active && req.user?.role !== 'admin')) {
    throw new HttpError(404, 'Service not found');
  }
  res.json({ service: toService(service) });
}

// POST /api/services: sirf admin
export async function createService(req, res) {
  const data = serviceCreateSchema.parse(req.body);

  const { rows } = await query(
    `INSERT INTO services (name, description, duration_min, price_cents, active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [data.name, data.description, data.durationMin, data.priceCents, data.active]
  );
  res.status(201).json({ service: toService(rows[0]) });
}

// PATCH /api/services/:id: sirf admin, jo fields bheje wahi badalte hain
export async function updateService(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const data = serviceUpdateSchema.parse(req.body);

  // Request ke naam -> database column
  const columns = {
    name: 'name',
    description: 'description',
    durationMin: 'duration_min',
    priceCents: 'price_cents',
    active: 'active',
  };

  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (data[key] !== undefined) {
      params.push(data[key]);
      sets.push(`${column} = $${params.length}`);
    }
  }

  params.push(id);
  const { rows } = await query(
    `UPDATE services SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${COLUMNS}`,
    params
  );
  // Updated service ka result terminal mein show hoga
  if (!rows[0]) throw new HttpError(404, 'Service not found');
  res.json({ service: toService(rows[0]) });
}

// DELETE /api/services/:id: sirf admin
// Jis service ki bookings hon use mitane ki jagah band (inactive) kar dete hain,
// taake purani bookings ka record na bigde
export async function deleteService(req, res) {
  const { id } = idParamSchema.parse(req.params);

  const { rows: found } = await query('SELECT id FROM services WHERE id = $1', [id]);
  if (!found[0]) throw new HttpError(404, 'Service not found');

  const { rows: used } = await query(
    'SELECT 1 FROM bookings WHERE service_id = $1 LIMIT 1',
    [id]
  );

  if (used.length > 0) {
    await query('UPDATE services SET active = FALSE WHERE id = $1', [id]);
    return res.json({
      deleted: false,
      deactivated: true,
      message: 'This service has bookings, so it has been deactivated instead of being deleted',
    });
  }

  await query('DELETE FROM services WHERE id = $1', [id]);
  res.json({ deleted: true, deactivated: false });
}
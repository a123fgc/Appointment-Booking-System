import { z } from 'zod';
import { pool, query, withTransaction } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/password.js';
import { removePhoto, savePhoto } from '../middleware/upload.js';
import { dayRangeUtc, todayStr } from '../utils/time.js';
import { getStaffSchedule } from '../services/booking.service.js';
import {
    staffCreateSchema,
    staffUpdateSchema,
    scheduleQuerySchema,
    idParamSchema,
} from '../validators/schemas.js';

/* ---------- Common query ---------- */

// Staff + user ka naam + unki services aur working hours, ek hi query mein
const SELECT = `
  SELECT s.id, s.user_id, u.name, u.email, s.bio, s.photo_url, s.active,
         COALESCE(
           (SELECT array_agg(ss.service_id ORDER BY ss.service_id)
              FROM staff_services ss WHERE ss.staff_id = s.id),
           '{}'
         ) AS service_ids,
         COALESCE(
           (SELECT json_agg(
                     json_build_object(
                       'weekday', h.weekday,
                       'start', to_char(h.start_time, 'HH24:MI'),
                       'end', to_char(h.end_time, 'HH24:MI')
                     ) ORDER BY h.weekday)
              FROM staff_hours h WHERE h.staff_id = s.id),
           '[]'
         ) AS hours
    FROM staff s
    JOIN users u ON u.id = s.user_id
`;

// Email sirf admin ko dikhti hai
function toStaff(r, isAdmin = false) {
    return {
        id: r.id,
        name: r.name,
        bio: r.bio,
        photo_url: r.photo_url,
        active: r.active,
        serviceIds: r.service_ids,
        hours: r.hours,
        ...(isAdmin ? { email: r.email } : {}),
    };
}

async function fetchStaff(id, db = pool) {
    const { rows } = await db.query(`${SELECT} WHERE s.id = $1`, [id]);
    return rows[0] || null;
}

// Staff ki services poori badal deta hai (purani hata kar nayi)
async function setServices(client, staffId, serviceIds) {
    await client.query('DELETE FROM staff_services WHERE staff_id = $1', [staffId]);

    const unique = [...new Set(serviceIds)];
    if (unique.length === 0) return;

    const { rows } = await client.query('SELECT id FROM services WHERE id = ANY($1::int[])', [unique]);
    if (rows.length !== unique.length) {
        throw new HttpError(400, 'No services available for the given serviceIds');
    }

    await client.query(
        'INSERT INTO staff_services (staff_id, service_id) SELECT $1, unnest($2::int[])',
        [staffId, unique]
    );
}

// Working hours poori badal deta hai
async function setHours(client, staffId, hours) {
    await client.query('DELETE FROM staff_hours WHERE staff_id = $1', [staffId]);

    for (const h of hours) {
        await client.query(
            'INSERT INTO staff_hours (staff_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4)',
            [staffId, h.weekday, h.start, h.end]
        );
    }
}

/* ---------- Dekhna ---------- */

// GET /api/staff?serviceId=1: sirf active staff (booking page ke liye)
export async function listStaff(req, res) {
    const { serviceId } = z
        .object({ serviceId: z.coerce.number().int().positive().optional() })
        .parse(req.query);

    const { rows } = await query(
        `${SELECT}
      WHERE s.active = TRUE
        AND ($1::int IS NULL OR EXISTS (
  SELECT 1 FROM staff_services ss
  WHERE ss.staff_id = s.id AND ss.service_id = $1
))
      ORDER BY u.name`,
        [serviceId ?? null]
    );
    res.json({ items: rows.map((r) => toStaff(r)) });
}

// GET /api/staff/all: sirf admin, band kiye hue staff bhi, email ke saath
export async function listAllStaff(req, res) {
    const { rows } = await query(`${SELECT} ORDER BY s.active DESC, u.name`);
    res.json({ items: rows.map((r) => toStaff(r, true)) });
}

// GET /api/staff/:id
export async function getStaff(req, res) {
    const { id } = idParamSchema.parse(req.params);
    const row = await fetchStaff(id);
    const isAdmin = req.user?.role === 'admin';

    // Band kiya hua staff sirf admin ko dikhta hai
    if (!row || (!row.active && !isAdmin)) throw new HttpError(404, 'Staff not found');
    res.json({ staff: toStaff(row, isAdmin) });
}

/* ---------- Banana / badalna / hatana (admin) ---------- */

// POST /api/staff: user aur staff dono ek saath banta hai.
// Form-data bhi chalta hai (tasveer ka field "photo").
export async function createStaff(req, res) {
    let newPhoto = null;

    try {
        newPhoto = await savePhoto(req.file);
        const data = staffCreateSchema.parse(req.body);
        const passwordHash = await hashPassword(data.password);

        const staffId = await withTransaction(async (client) => {
            // Email pehle se ho to unique index (23505) error deta hai, errorHandler 409 bana deta hai
            const { rows: u } = await client.query(
                `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'staff') RETURNING id`,
                [data.name, data.email, passwordHash]
            );

            const { rows: s } = await client.query(
                'INSERT INTO staff (user_id, bio, photo_url) VALUES ($1, $2, $3) RETURNING id',
                [u[0].id, data.bio, newPhoto]
            );

            await setServices(client, s[0].id, data.serviceIds);
            await setHours(client, s[0].id, data.hours);
            return s[0].id;
        });

        res.status(201).json({ staff: toStaff(await fetchStaff(staffId), true) });
    } catch (err) {
        await removePhoto(newPhoto);
        throw err;
    }
}

// PATCH /api/staff/:id: jo fields bheje wahi badalte hain
export async function updateStaff(req, res) {
    const { id } = idParamSchema.parse(req.params);
    let newPhoto = null;

    try {
        newPhoto = await savePhoto(req.file);
        // Sirf tasveer badalni ho to baqi fields khali ho sakti hain
        const onlyPhoto = req.file && Object.keys(req.body || {}).length === 0;
        const data = onlyPhoto ? {} : staffUpdateSchema.parse(req.body);

        let oldPhoto = null;

        await withTransaction(async (client) => {
            const { rows } = await client.query(
                'SELECT id, user_id, photo_url FROM staff WHERE id = $1 FOR UPDATE',
                [id]
            );
            const st = rows[0];
            if (!st) throw new HttpError(404, 'Staff not found');

            if (data.name !== undefined) {
                await client.query('UPDATE users SET name = $1 WHERE id = $2', [data.name, st.user_id]);
            }

            const sets = [];
            const params = [];
            if (data.bio !== undefined) {
                params.push(data.bio);
                sets.push(`bio = $${params.length}`);
            }
            if (data.active !== undefined) {
                params.push(data.active);
                sets.push(`active = $${params.length}`);
            }
            if (newPhoto) {
                params.push(newPhoto);
                sets.push(`photo_url = $${params.length}`);
                oldPhoto = st.photo_url;
            }
            if (sets.length > 0) {
                params.push(st.id);
                await client.query(`UPDATE staff SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
            }

            if (data.active === false) {
                await client.query(
                    `UPDATE public.user_sessions
                        SET revoked_at = NOW()
                      WHERE user_id = $1 AND revoked_at IS NULL`,
                    [st.user_id]
                );
            }

            if (data.serviceIds !== undefined) await setServices(client, st.id, data.serviceIds);
            if (data.hours !== undefined) await setHours(client, st.id, data.hours);
        });

        await removePhoto(oldPhoto);
        res.json({ staff: toStaff(await fetchStaff(id), true) });
    } catch (err) {
        await removePhoto(newPhoto);
        throw err;
    }
}

// DELETE /api/staff/:id
// Jis staff ki bookings hon use mitane ki jagah band kar dete hain, taake purana record na bigde
export async function deleteStaff(req, res) {
    const { id } = idParamSchema.parse(req.params);
    const result = await withTransaction(async (client) => {
        const { rows } = await client.query(
            'SELECT id, user_id, photo_url FROM staff WHERE id = $1 FOR UPDATE',
            [id]
        );
        const st = rows[0];
        if (!st) throw new HttpError(404, 'Staff not found');

        const { rows: used } = await client.query(
            'SELECT 1 FROM bookings WHERE staff_id = $1 LIMIT 1',
            [id]
        );

        if (used.length > 0) {
            await client.query('UPDATE staff SET active = FALSE WHERE id = $1', [id]);
            await client.query(
                `UPDATE public.user_sessions
                    SET revoked_at = NOW()
                  WHERE user_id = $1 AND revoked_at IS NULL`,
                [st.user_id]
            );
            return { deactivated: true, photoUrl: null };
        }

        await client.query(
            `UPDATE public.user_sessions
                SET revoked_at = NOW()
              WHERE user_id = $1 AND revoked_at IS NULL`,
            [st.user_id]
        );
        // User mitane se staff, uski services aur hours bhi khud hat jate hain (CASCADE)
        await client.query('DELETE FROM users WHERE id = $1', [st.user_id]);
        return { deactivated: false, photoUrl: st.photo_url };
    });

    if (result.deactivated) {
        return res.json({
            deleted: false,
            deactivated: true,
            message: 'This staff has bookings, so it has been deactivated instead of being deleted',
        });
    }

    await removePhoto(result.photoUrl);
    res.json({ deleted: true, deactivated: false });
}

/* ---------- Staff ka apna schedule ---------- */

// GET /api/staff/me/schedule?date=2026-11-10: sirf staff, date na do to aaj
export async function mySchedule(req, res) {
    if (!req.user.staffId) throw new HttpError(403, 'You are not authorized to perform this action');

    const { date = todayStr() } = scheduleQuerySchema.parse(req.query);
    const items = await getStaffSchedule({
        staffId: req.user.staffId,
        range: dayRangeUtc(date),
    });

    res.json({ date, items });
}
export async function myStaffProfile(req, res) {
  if (!req.user.staffId) {
    throw new HttpError(403, 'Staff profile not found');
  }

  const row = await fetchStaff(req.user.staffId);

  if (!row) {
    throw new HttpError(404, 'Staff profile not found');
  }

  res.json({
    staff: toStaff(row, true),
  });
}

export async function uploadMyStaffPhoto(req, res) {
    if (!req.user.staffId) {
        removePhoto(photoUrl(req.file));
        throw new HttpError(403, 'Staff profile not found');
    }

    const newPhoto = photoUrl(req.file);
    if (!newPhoto) throw new HttpError(400, 'Please upload a photo');

    let updatedStaff;
    let oldPhoto;
    try {
        updatedStaff = await withTransaction(async (client) => {
            const { rows } = await client.query(
                'SELECT photo_url FROM staff WHERE id = $1 FOR UPDATE',
                [req.user.staffId]
            );
            if (!rows[0]) throw new HttpError(404, 'Staff profile not found');
            oldPhoto = rows[0].photo_url;
            await client.query(
                'UPDATE staff SET photo_url = $1 WHERE id = $2',
                [newPhoto, req.user.staffId]
            );
            return fetchStaff(req.user.staffId, client);
        });
        res.json({ staff: toStaff(updatedStaff, true) });
        removePhoto(oldPhoto);
    } catch (err) {
        removePhoto(newPhoto);
        throw err;
    }
}

/* ---------- Staff Working Hours ---------- */

// PUT /api/staff/:id/hours
// Sirf admin staff ke working hours update kar sakta hai.

const staffHoursSchema = z.array(
    z.object({
        weekday: z.number().int().min(0).max(6),
        start: z.string().regex(
            /^([01]\d|2[0-3]):[0-5]\d$/,
            'Invalid start time'
        ),
        end: z.string().regex(
            /^([01]\d|2[0-3]):[0-5]\d$/,
            'Invalid end time'
        ),
    }).refine(
        (hour) => hour.end > hour.start,
        {
            message: 'The end time must be later than the start time',
            path: ['end'],
        }
    )
).refine(
    (hours) => new Set(hours.map(h => h.weekday)).size === hours.length,
    {
        message: 'Duplicate weekdays are not allowed',
    }
);

export async function updateStaffHours(req, res) {
    const { id } = idParamSchema.parse(req.params);

    const hours = staffHoursSchema.parse(req.body);

    await withTransaction(async (client) => {

        const { rows } = await client.query(
            'SELECT id FROM staff WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (!rows[0]) {
            throw new HttpError(404, 'Staff not found');
        }

        // Purane hours replace karke naye hours save karein
        await setHours(client, id, hours);
    });

    const row = await fetchStaff(id);

    res.json({
        success: true,
        message: 'Staff working hours updated successfully.',
        staff: toStaff(row, true),
    });
}

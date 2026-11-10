import {
  createBooking as createBookingSvc,
  rescheduleBooking as rescheduleBookingSvc,
  updateBookingStatus as updateStatusSvc,
  getBookingForUser,
  listMyBookings as listMyBookingsSvc,
  listAllBookings as listAllBookingsSvc,
} from '../services/booking.service.js';
import {
  bookingCreateSchema,
  rescheduleSchema,
  bookingStatusSchema,
  bookingsListQuerySchema,
  idParamSchema,
} from '../validators/schemas.js';

// Controller ka kaam sirf: data parhna, validate karna, service ko dena, jawab bhejna.
// Asal logic (ijazat, slot check, email) services/booking.js mein hai.

// POST /api/bookings: sirf customer
export async function createBooking(req, res) {
  const data = bookingCreateSchema.parse(req.body);

  const booking = await createBookingSvc({
    customerId: req.user.id,
    serviceId: data.serviceId,
    staffId: data.staffId,
    date: data.date,
    time: data.time,
    notes: data.notes,
  });

  res.status(201).json({ booking });
}

// GET /api/bookings/mine: customer ki apni bookings
export async function listMyBookings(req, res) {
  const items = await listMyBookingsSvc(req.user.id);
  res.json({ items });
}

// GET /api/bookings/:id: customer (apni), staff (apni mili hui), admin (sab)
export async function getBooking(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const booking = await getBookingForUser(id, req.user);
  res.json({ booking });
}

// PATCH /api/bookings/:id/reschedule: customer (apni) ya admin
export async function rescheduleBooking(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const { date, time } = rescheduleSchema.parse(req.body);

  const booking = await rescheduleBookingSvc({ id, user: req.user, date, time });
  res.json({ booking });
}

// PATCH /api/bookings/:id/status: body { status: 'cancelled' | 'completed' }
export async function updateBookingStatus(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const { status } = bookingStatusSchema.parse(req.body);

  const booking = await updateStatusSvc({ id, user: req.user, status });
  res.json({ booking });
}

// GET /api/bookings: sirf admin, ?q=&status=&page=&limit=
export async function listAllBookings(req, res) {
  const filters = bookingsListQuerySchema.parse(req.query);
  const result = await listAllBookingsSvc(filters);
  res.json(result); // { items, total, page, limit }
}
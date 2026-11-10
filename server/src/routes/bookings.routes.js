import { Router } from 'express';
import {
  createBooking,
  listMyBookings,
  listAllBookings,
  getBooking,
  rescheduleBooking,
  updateBookingStatus,
} from '../controllers/bookings.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Is file ke saare routes ke liye login zaroori hai
router.use(requireAuth);

// Sirf admin: saari bookings, ?q=&status=&page=&limit=
router.get('/', requireRole('admin'), asyncHandler(listAllBookings));

// Sirf customer: apni bookings. "/mine" ko "/:id" se pehle rakhna zaroori hai,
// warna "mine" ko id samjha jaye ga.
router.get('/mine', requireRole('customer'), asyncHandler(listMyBookings));

// Sirf customer: nayi booking
router.post('/', requireRole('customer'), asyncHandler(createBooking));

// Customer (apni), staff (apni mili hui), admin (sab). Ijazat service mein check hoti hai.
router.get('/:id', asyncHandler(getBooking));

// Customer (apni) ya admin. Staff ko service 403 deti hai.
router.patch('/:id/reschedule', requireRole('customer', 'admin'), asyncHandler(rescheduleBooking));

// Cancel: customer, staff, admin. Complete: staff, admin (customer ko service 403 deti hai).
router.patch('/:id/status', asyncHandler(updateBookingStatus));

export default router;
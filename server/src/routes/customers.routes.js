import { Router } from 'express';
import { listCustomerBookings, listCustomers } from '../controllers/customers.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', asyncHandler(listCustomers));
router.get('/:id/bookings', asyncHandler(listCustomerBookings));

export default router;

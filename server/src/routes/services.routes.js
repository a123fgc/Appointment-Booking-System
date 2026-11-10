import { Router } from 'express';
import {
  listServices,
  listAllServices,
  getService,
  createService,
  updateService,
  deleteService,
} from '../controllers/services.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Sab ke liye (login ke baghair): sirf active services
router.get('/', asyncHandler(listServices));

// Sirf admin: band ki hui services bhi. "/all" ko "/:id" se pehle rakhna zaroori hai,
// warna "all" ko id samjha jaye ga.
router.get('/all', requireAuth, requireRole('admin'), asyncHandler(listAllServices));

router.get('/:id', asyncHandler(getService));

// Sirf admin
router.post('/', requireAuth, requireRole('admin'), asyncHandler(createService));
router.patch('/:id', requireAuth, requireRole('admin'), asyncHandler(updateService));
router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(deleteService));

export default router;
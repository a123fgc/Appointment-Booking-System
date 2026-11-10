import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/dashboard: sirf admin
router.get('/', requireAuth, requireRole('admin'), asyncHandler(getDashboard));

export default router;
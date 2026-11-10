import { Router } from 'express';
import { getAvailableSlots } from '../services/slots.service.js';
import { slotsQuerySchema } from '../validators/schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/slots?serviceId=1&date=2026-11-10&staffId=2   (staffId optional)
// Login ke baghair chalta hai, taake booking page slots dikha sake.
// Slots ka controller alag nahi hai, kyunke yeh sirf ek chhota sa kaam hai.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { serviceId, date, staffId } = slotsQuerySchema.parse(req.query);
    const items = await getAvailableSlots({ serviceId, date, staffId });
    res.json({ items });
  })
);

export default router;
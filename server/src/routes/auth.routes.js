import { Router } from 'express';
import { signup, login, me, logout} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { loginRateLimit, signupRateLimit } from '../middleware/rateLimit.js';

const router = Router();

// POST /api/auth/signup: naya customer account
router.post('/signup', signupRateLimit, asyncHandler(signup));
//logout route
router.post('/logout', requireAuth, asyncHandler(logout));
// POST /api/auth/login
router.post('/login', loginRateLimit, asyncHandler(login));

// GET /api/auth/me: token se maujooda user (page refresh par frontend yahi poochta hai)
router.get('/me', requireAuth, me);

export default router;

import { Router } from 'express';
import {
    listStaff,
    listAllStaff,
    getStaff,
    createStaff,
    updateStaff,
    deleteStaff,
    mySchedule,
    myStaffProfile,
    uploadMyStaffPhoto,
     updateStaffHours,
} from '../controllers/staff.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { uploadPhoto } from '../middleware/upload.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Sab ke liye (login ke baghair): sirf active staff, ?serviceId= se filter
router.get('/', asyncHandler(listStaff));
// Sirf admin: staff working hours update
router.put(
    '/:id/hours',
    requireAuth,
    requireRole('admin'),
    asyncHandler(updateStaffHours)
);

// Sirf admin: band kiye hue staff bhi, email ke saath
router.get('/all', requireAuth, requireRole('admin'), asyncHandler(listAllStaff));

// Sirf staff: apna schedule. "/me/schedule" ko "/:id" se pehle rakhna zaroori hai,
// warna "me" ko id samjha jaye ga.
router.get('/me/schedule', requireAuth, requireRole('staff'), asyncHandler(mySchedule));
router.get(
    '/me',
    requireAuth,
    requireRole('staff'),
    asyncHandler(myStaffProfile)
);
router.patch(
    '/me/photo',
    requireAuth,
    requireRole('staff'),
    uploadPhoto,
    asyncHandler(uploadMyStaffPhoto)
);

router.get('/:id', asyncHandler(getStaff));

// Sirf admin. Tasveer ka field "photo" hai (form-data).
// uploadPhoto login aur role check ke baad lagta hai, taake bina ijazat koi file disk par na aaye.
router.post('/', requireAuth, requireRole('admin'), uploadPhoto, asyncHandler(createStaff));
router.patch('/:id', requireAuth, requireRole('admin'), uploadPhoto, asyncHandler(updateStaff));
router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(deleteStaff));
export default router;
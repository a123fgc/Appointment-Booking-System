// 
import multer from 'multer';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
// import { uploadPhotoMiddleware , savePhoto } from '../middleware/upload.js';
// Supabase Storage configuration
const BUCKET_NAME = 'staff-photos';

const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

// Allowed image MIME types
const ALLOWED_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

// Multer memory storage: Vercel-compatible
const storage = multer.memoryStorage();

const upload = multer({
    storage,

    limits: {
        fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
        files: 1,
    },

    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES[file.mimetype]) {
            return cb(null, true);
        }

        const error = new Error(
            'Sirf JPG, PNG ya WEBP tasveer allowed hai.'
        );

        error.status = 400;
        return cb(error);
    },
});

// Form field ka naam "photo" hona chahiye
export const uploadPhotoMiddleware  = upload.single('photo');

/**
 * Upload image to Supabase Storage.
 * Returns the public URL of the uploaded image.
 */
export async function savePhoto(file) {
    if (!file) return null;

    const extension = ALLOWED_TYPES[file.mimetype];

    if (!extension) {
        const error = new Error('Invalid image type.');
        error.status = 400;
        throw error;
    }

    const filename = `${crypto.randomUUID()}.${extension}`;
    const filePath = `staff/${filename}`;

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        console.error('Supabase photo upload error:', error.message);

        const uploadError = new Error(
            'Photo upload nahi ho saki. Dobara try karein.'
        );

        uploadError.status = 500;
        throw uploadError;
    }

    return photoUrl(filePath);
}

/**
 * Generate public URL for a Supabase Storage image.
 */
export function photoUrl(filePath) {
    if (!filePath) return null;

    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    return data.publicUrl;
}

/**
 * Delete an old image from Supabase Storage.
 * Accepts the complete public URL or storage file path.
 */
export async function removePhoto(url) {
    if (!url) return;

    try {
        let filePath = url;

        // Agar complete public URL diya gaya ho
        if (url.startsWith('http://') || url.startsWith('https://')) {
            const parsedUrl = new URL(url);

            const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
            const markerIndex = parsedUrl.pathname.indexOf(marker);

            // Sirf isi bucket ki files delete karein
            if (markerIndex === -1) return;

            filePath = decodeURIComponent(
                parsedUrl.pathname.slice(markerIndex + marker.length)
            );
        }

        // Sirf staff folder ki files delete hongi
        if (!filePath.startsWith('staff/')) return;

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error) {
            console.error('Supabase photo deletion error:', error.message);
        }
    } catch (error) {
        console.error('Photo deletion failed:', error.message);
    }
}

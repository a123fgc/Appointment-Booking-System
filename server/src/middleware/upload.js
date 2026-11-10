import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const uploadDir = path.resolve(env.UPLOAD_DIR);

// Folder na ho to bana do
fs.mkdirSync(uploadDir, { recursive: true });

// Sirf yeh image types allowed hain (extension file ke type se tay hoti hai, user ke naam se nahi)
const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, name + ALLOWED[file.mimetype]);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    const err = new Error('Sirf JPG, PNG ya WEBP tasveer allowed hai');
    err.status = 400;
    cb(err);
  },
});

// Use: router.post('/', requireAuth, requireRole('admin'), uploadPhoto, handler)
// Form field ka naam "photo" hona chahiye. File milne par req.file set hoti hai.
export const uploadPhoto = upload.single('photo');

// DB mein save karne ke liye public URL: /uploads/<filename>
export function photoUrl(file) {
  return file ? `/uploads/${file.filename}` : null;
}

// Purani photo badalte waqt disk se hata dene ke liye
export function removePhoto(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const filePath = path.join(uploadDir, path.basename(url));
  fs.unlink(filePath, () => {});
}
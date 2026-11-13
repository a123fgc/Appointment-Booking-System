import { ZodError } from 'zod';
import multer from 'multer';
import { env } from '../config/env.js';

// Kisi bhi route ke liye jo mojood nahi (routes ke baad lagayen)
export function notFound(req, res) {
  res.status(404).json({ error: 'Address not found' });
}
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
// Controllers mein masla aane par yeh aise phenkein:
//   throw new HttpError(404, 'Booking not found')
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Sab se aakhir mein lagayen: app.use(errorHandler)
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Validation (zod): pehli ghalti ko main message banate hain, baqi details mein
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    const first = issues[0];
    return res.status(400).json({
      error: first ? `${first.field ? first.field + ': ' : ''}${first.message}` : 'Ghalat data',
      details: issues,
    });
  }

  // Upload ke masle (multer)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json({ error: `Image must be smaller than ${env.MAX_UPLOAD_MB} MB` });
    }
    return res.status(400).json({ error: 'Error occurred while uploading the image' });
  }

  // Ghalat JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The provided JSON is invalid' });
  }

  // PostgreSQL ke masle
  switch (err.code) {
    case '23P01': // exclusion_violation: staff ka waqt overlap
      return res
        .status(409)
        .json({ error: 'This time slot is already booked, please choose another slot' });
    case '23505': // unique_violation
      if (err.constraint === 'users_email_unique') {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      return res.status(409).json({ error: 'This record already exists' });
    case '23503': // foreign_key_violation
      return res.status(409).json({ error: 'This record has dependencies and cannot be deleted' });
    case '23514': // check_violation
    case '22P02': // ghalat format (jaise id number nahi)
      return res.status(400).json({ error: 'Invalid data provided' });
    default:
  }

  // Jin errors ko humne khud status diya (HttpError, upload.js, wagaira)
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // Baqi sab: asal wajah sirf log mein, user ko aam message
  console.error(err);
  res.status(500).json({
    error: 'Server error occurred, please try again later',
    ...(env.isProd ? {} : { debug: err.message }),
  });
}
import { z } from 'zod';
import { isValidDateStr, isValidTimeStr } from '../utils/time.js';
import { isStrongPassword, PASSWORD_RULE_MESSAGE } from '../utils/password.js';

/* ---------- Chhote helpers ---------- */

const id = z.coerce.number().int().positive();

const dateStr = z.string().refine(isValidDateStr, 'Date YYYY-MM-DD format mein ho (jaise 2026-11-10)');
const timeStr = z.string().refine(isValidTimeStr, 'Waqt HH:MM format mein ho (jaise 14:30)');

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email durust nahi')
  .max(254);

const name = z.string().trim().min(2, 'Naam kam az kam 2 harf ka ho').max(100);

const password = z.string().refine(isStrongPassword, PASSWORD_RULE_MESSAGE);

// Form-data (tasveer ke saath) mein arrays string ban kar aate hain, jaise "[1,2]".
// Yeh helper string ko JSON samajh kar parh leta hai, aam JSON body mein bhi chalta hai.
const jsonField = (schema) =>
  z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }, schema);

// "true"/"false" string (form-data) ya asal boolean
const boolField = z.preprocess((v) => {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}, z.boolean());

/* ---------- Auth ---------- */

export const signupSchema = z.object({
  name,
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password likhein'),
});

/* ---------- Services ---------- */

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(''),
  durationMin: z.coerce.number().int().min(5, 'Kam az kam 5 minute').max(480),
  priceCents: z.coerce.number().int().min(0).max(100_000_000).default(0),
  active: boolField.default(true),
});


export const serviceUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),

  description: z.string().trim().max(500).optional(),

  durationMin: z.coerce
    .number()
    .int()
    .min(5, 'Kam az kam 5 minute')
    .max(480)
    .optional(),

  priceCents: z.coerce
    .number()
    .int()
    .min(0)
    .max(100_000_000)
    .optional(),

  active: boolField.optional(),
}).refine(
  (o) => Object.keys(o).length > 0,
  'Badalne ke liye kuch to bhejein'
);


/* ---------- Staff ---------- */

const hourSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    start: timeStr,
    end: timeStr,
  })
  .refine((h) => h.end > h.start, 'Khatam hone ka waqt shuru se baad ho');

const hoursList = jsonField(
  z
    .array(hourSchema)
    .max(7)
    .refine(
      (list) => new Set(list.map((h) => h.weekday)).size === list.length,
      'Ek din ke liye sirf ek waqt dein'
    )
);

const serviceIds = jsonField(z.array(id).max(50));

export const staffCreateSchema = z.object({
  name,
  email,
  password,
  bio: z.string().trim().max(500).default(''),
  serviceIds: serviceIds.default([]),
  hours: hoursList.default([]),
});

export const staffUpdateSchema = z
  .object({
    name,
    bio: z.string().trim().max(500),
    active: boolField,
    serviceIds,
    hours: hoursList,
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Badalne ke liye kuch to bhejein');

/* ---------- Slots ---------- */

// GET /slots?serviceId=1&date=2026-11-10&staffId=2 (staffId optional)
export const slotsQuerySchema = z.object({
  serviceId: id,
  date: dateStr,
  staffId: id.optional(),
});

/* ---------- Bookings ---------- */

export const bookingCreateSchema = z.object({
  serviceId: id,
  staffId: id,
  date: dateStr,
  time: timeStr,
  notes: z.string().trim().max(500).default(''),
});

export const rescheduleSchema = z.object({
  date: dateStr,
  time: timeStr,
});

// Staff apni booking ko complete kar sakta hai, ya koi bhi cancel kar sakta hai
export const bookingStatusSchema = z.object({
  status: z.enum(['completed', 'cancelled', 'no_show']),
});

// Admin ki bookings list: search, status filter, pagination
export const bookingsListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const customersListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const customerBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Staff ka schedule: kisi ek din ki bookings
export const scheduleQuerySchema = z.object({
  date: dateStr.optional(),
});

/* ---------- URL ke :id ---------- */

export const idParamSchema = z.object({ id });
import { env } from '../config/env.js';

const TZ = env.BUSINESS_TZ;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// "2026-11-10" durust date hai ya nahi (jaise 2026-02-31 ghalat hai)
export function isValidDateStr(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTimeStr(s) {
  return typeof s === 'string' && TIME_RE.test(s);
}

// Date ke din ka number: 0 = Sunday ... 6 = Saturday (timezone se azad)
export function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// "2026-11-10" + days -> naya "YYYY-MM-DD"
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// Do waqt ke darmiyan overlap? (end par chhoone wale slots overlap nahi hote)
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Us waqt business timezone UTC se kitne milliseconds aage/peeche hai
function tzOffsetMs(utcMs, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const v = {};
  for (const p of parts) v[p.type] = Number(p.value);

  const asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

// Business timezone ki date + waqt ("2026-11-10", "14:30") ko asal UTC Date banata hai
export function zonedToUtc(dateStr, timeStr, tz = TZ) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);

  // DST wale mulkon ke liye offset do baar check karte hain
  const off1 = tzOffsetMs(guess, tz);
  const first = guess - off1;
  const off2 = tzOffsetMs(first, tz);
  return new Date(off1 === off2 ? first : guess - off2);
}

// Kisi bhi waqt ki business timezone mein date: "YYYY-MM-DD"
export function dateStrInTz(date, tz = TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Aaj ki date business timezone mein
export function todayStr(tz = TZ) {
  return dateStrInTz(new Date(), tz);
}

// Poore din ka UTC range: [start, end). Query mein start_time >= start AND start_time < end
export function dayRangeUtc(dateStr, tz = TZ) {
  return {
    start: zonedToUtc(dateStr, '00:00', tz),
    end: zonedToUtc(addDays(dateStr, 1), '00:00', tz),
  };
}

// Email wagaira ke liye: "Tue, 10 Nov 2026, 2:30 PM"
export function formatDateTime(date, tz = TZ) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
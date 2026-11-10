// Salon ka timezone. Kisi aur mulk ke liye badlein, jaise 'Asia/Dubai'
export const SALON_TZ = 'Asia/Karachi';

export const WEEKDAYS = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TZ,
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
});

const timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TZ,
    hour: 'numeric', minute: '2-digit', hour12: true,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TZ,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

const shortDayFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric', month: 'short',
});

// "Tue, 10 Nov 2026, 2:30 pm"
export const formatDateTime = (iso) => dateTimeFmt.format(new Date(iso));

// "2:30 pm"
export const formatTime = (iso) => timeFmt.format(new Date(iso));

// "Tuesday, 10 November 2026"
export const formatDate = (iso) => dateFmt.format(new Date(iso));

// "2026-11-10" (YYYY-MM-DD) ko parhne layak tareekh banata hai
export const formatDateStr = (dateStr) =>
    dateFmt.format(new Date(`${dateStr}T00:00:00Z`)).replace(/^(\w+)/, '$1');

// "10 Nov" (chart ke labels ke liye)
export const shortDay = (dateStr) => shortDayFmt.format(new Date(`${dateStr}T00:00:00Z`));

// Salon ki
export function todayStr() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
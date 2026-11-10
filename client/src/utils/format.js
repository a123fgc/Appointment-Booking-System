// 1500 -> "Rs 1,500"
export const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;

// Booking status ke naam
export const STATUS_LABEL = {
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

// "Ayesha Khan" -> "AK" (photo na ho to avatar mein dikhane ke liye)
export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
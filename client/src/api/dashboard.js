import { api } from './client.js';

// GET /dashboard (sirf admin)
//   -> { perDay: [{ day: "2026-11-10", count: 3 }],      // aakhri 14 din
//        revenue: 12500,                                  // sirf completed bookings
//        busiest: { name: "Ayesha Khan", count: 12 } | null,
//        noShowRate: 14.3,                                // percent
//        totals: { bookings, customers, staff } }
export const getDashboard = () => api.get('/dashboard');
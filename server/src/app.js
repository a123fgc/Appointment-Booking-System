import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import servicesRoutes from './routes/services.routes.js';
import staffRoutes from './routes/staff.routes.js';
import slotsRoutes from './routes/slots.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import customersRoutes from './routes/customers.routes.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ---- CORS ----
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  env.CLIENT_URL, // stable frontend domain
].filter(Boolean);

// every deployment URL of your frontend project on Vercel
const vercelPreview =
  /^https:\/\/appointment-booking-system-[a-z0-9]+-asad-developer\.vercel\.app$/;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman, server-to-server
    if (allowedOrigins.includes(origin) || vercelPreview.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false); // blocked, but no server crash
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight requests
// ---- end CORS ----

app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Appointment Booking API is running' });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customersRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
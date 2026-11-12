import express from 'express';
import cors from 'cors';

import helmet from 'helmet';
// import authRoutes from './routes/auth.js';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import servicesRoutes from './routes/services.routes.js';
import staffRoutes from './routes/staff.routes.js';
import slotsRoutes from './routes/slots.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();

// Security headers. Tasveerein frontend (doosre port) par dikhni hain, is liye cross-origin allowed
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Sirf apna frontend is API ko istemal kar sakta hai
app.use(cors({ origin: env.CLIENT_URL }));

app.use(express.json({ limit: '100kb' }));

// Server chal raha hai ya nahi
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Tarteeb zaroori hai: pehle notFound, sab se aakhir mein errorHandler
app.use(notFound);
app.use(errorHandler);

export default app;
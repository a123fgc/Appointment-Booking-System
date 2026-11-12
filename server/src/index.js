// import app from './app.js';
import app from '../src/app.js';
import { env } from './config/env.js';
import { checkConnection, closePool } from './config/db.js';

async function start() {
  // Server shuru karne se pehle database check
  try {
    await checkConnection();
  } catch (err) {
    console.error('Don`t connect to database:', err.message);
    console.error('DATABASE_URL check and ensure Postgres is running.');
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`Server chal raha hai: http://localhost:${env.PORT}`);
    console.log(`Frontend ka URL (CORS): ${env.CLIENT_URL}`);
    if (!env.smtpEnabled) console.log('SMTP set nahi: emails print only Console.');
  });

  // Ctrl+C ya band hone par saaf tareeqe se rukna
  const shutdown = (signal) => {
    console.log(`\n${signal} server are shutting down...`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    // Agar 10 second mein band na ho to zabardasti
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
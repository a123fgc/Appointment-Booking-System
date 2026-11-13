
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');
const sessionMigrationPath = path.join(__dirname, 'migrations', '001_user_sessions.sql');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL are not set. Please check the .env file.');
    process.exit(1);
  }

  const sql = readFileSync(schemaPath, 'utf8');
  const sessionMigrationSql = readFileSync(sessionMigrationPath, 'utf8');
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Database connected successfully!');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query(sessionMigrationSql);
    await client.query('COMMIT');

    console.log('Migration successful: tables are created.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();

import assert from 'node:assert/strict';
import test from 'node:test';
import { postgresConnectionOptions } from '../src/config/postgresOptions.js';

test('uses strict TLS and applies the supplied CA certificate', () => {
  const options = postgresConnectionOptions(
    'postgres://user:password@db.example.test:5432/booking?sslmode=require&sslrootcert=ignored&application_name=booking',
    '-----BEGIN CERTIFICATE-----\\nroot-ca\\n-----END CERTIFICATE-----'
  );
  const databaseUrl = new URL(options.connectionString);

  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(
    options.ssl.ca,
    '-----BEGIN CERTIFICATE-----\nroot-ca\n-----END CERTIFICATE-----'
  );
  assert.equal(databaseUrl.searchParams.has('sslmode'), false);
  assert.equal(databaseUrl.searchParams.has('sslrootcert'), false);
  assert.equal(databaseUrl.searchParams.get('application_name'), 'booking');
});

test('keeps certificate validation enabled when no custom CA is supplied', () => {
  const options = postgresConnectionOptions(
    'postgres://user:password@db.example.test:5432/booking',
    undefined
  );

  assert.deepEqual(options.ssl, { rejectUnauthorized: true });
});

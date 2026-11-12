-- Booking app schema (PostgreSQL)
-- Is file ko migrate.js chalata hai. Dobara chalane par safe hai.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------- Users ----------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'staff', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

-- ---------- Services ----------
CREATE TABLE IF NOT EXISTS services (
  id           SERIAL PRIMARY KEY,
  name         TEXT        NOT NULL,
  description  TEXT        NOT NULL DEFAULT '',
  duration_min INTEGER     NOT NULL CHECK (duration_min > 0),
  price_cents  INTEGER     NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Staff ----------
CREATE TABLE IF NOT EXISTS staff (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  bio        TEXT        NOT NULL DEFAULT '',
  photo_url  TEXT,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kaun sa staff kaun si services deta hai
CREATE TABLE IF NOT EXISTS staff_services (
  staff_id   INTEGER NOT NULL REFERENCES staff (id)    ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

-- Haftawar working hours (weekday: 0 = Sunday ... 6 = Saturday)
CREATE TABLE IF NOT EXISTS staff_hours (
  id         SERIAL PRIMARY KEY,
  staff_id   INTEGER NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
  weekday    SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME    NOT NULL,
  end_time   TIME    NOT NULL,
  CHECK (end_time > start_time),
  UNIQUE (staff_id, weekday)
);

-- ---------- Bookings ----------
CREATE TABLE IF NOT EXISTS bookings (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER     NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
  staff_id    INTEGER     NOT NULL REFERENCES staff (id)    ON DELETE RESTRICT,
  service_id  INTEGER     NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'confirmed'
              CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  notes       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),

  -- Race condition se bachao: ek staff ki do confirmed bookings
  -- aapas mein overlap nahi kar sakti, chahe dono requests ek saath aayen.
  CONSTRAINT bookings_no_overlap
    EXCLUDE USING gist (
      staff_id WITH =,
      tstzrange(start_time, end_time) WITH &&
    ) WHERE (status = 'confirmed')
);

CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings (customer_id, start_time DESC);
CREATE INDEX IF NOT EXISTS bookings_staff_idx    ON bookings (staff_id, start_time);
CREATE INDEX IF NOT EXISTS bookings_status_idx   ON bookings (status);

DO $$
BEGIN
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
  ALTER TABLE bookings
    ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show'));
END $$;
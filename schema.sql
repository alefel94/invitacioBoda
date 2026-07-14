-- Ejecuta esto UNA VEZ en el query editor de tu base de datos
-- Vercel Postgres (dashboard del proyecto → pestaña Storage → tu base → Query).

CREATE TABLE IF NOT EXISTS rsvp_responses (
  id           SERIAL PRIMARY KEY,
  full_name    TEXT NOT NULL,
  attending    BOOLEAN NOT NULL DEFAULT TRUE,
  guest_count  INTEGER NOT NULL DEFAULT 1,
  message      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

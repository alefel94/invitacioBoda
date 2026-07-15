-- ============================================================
-- Invitación de boda — Viridiana & Felipe
-- Esquema para PostgreSQL (Vercel Postgres / Neon).
-- Corre esto en el query editor de tu base (dashboard de Vercel →
-- Storage → tu base de Postgres → pestaña "Query"). Es seguro volver
-- a ejecutarlo completo: todo usa IF NOT EXISTS.
-- ============================================================

-- 1) Catálogo de invitados: la lista que TÚ armas de antemano, una fila
--    por invitación (puede ser una familia completa o una sola persona).
--    Cada uno tiene un "invite_code" único que va en su link personalizado:
--    tusitio.com/?invite=PEREZ2026
CREATE TABLE IF NOT EXISTS guests (
  id              SERIAL PRIMARY KEY,
  invite_code     TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,                                        -- ej. "Familia Pérez García" o "Juan Pérez"
  guest_group     TEXT,                                                 -- ej. 'Novia', 'Novio', 'Familia', 'Amigos' (opcional, solo para organizarte)
  allowed_guests  INTEGER NOT NULL DEFAULT 1 CHECK (allowed_guests > 0), -- boletos asignados a esta invitación
  phone           TEXT,                                                 -- opcional, para mandarles el link por WhatsApp
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Confirmaciones reales que llegan por el formulario.
CREATE TABLE IF NOT EXISTS rsvp_responses (
  id           SERIAL PRIMARY KEY,
  guest_id     INTEGER REFERENCES guests(id) ON DELETE SET NULL,
  full_name    TEXT NOT NULL,
  attending    BOOLEAN NOT NULL DEFAULT TRUE,
  guest_count  INTEGER NOT NULL DEFAULT 1,
  message      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- si tu tabla rsvp_responses ya existía de antes (versión sin invitados),
-- esto le agrega la columna nueva sin perder las respuestas que ya tenías
ALTER TABLE rsvp_responses ADD COLUMN IF NOT EXISTS guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL;

-- una sola confirmación por invitación (así, si vuelven a confirmar con su
-- mismo link, se ACTUALIZA su respuesta en vez de crear una duplicada)
CREATE UNIQUE INDEX IF NOT EXISTS rsvp_responses_guest_id_key
  ON rsvp_responses(guest_id) WHERE guest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS guests_invite_code_idx ON guests(invite_code);

-- 3) Vista de resumen: junta cada invitado con su confirmación (si ya
--    respondió), para que el panel admin haga una sola consulta simple.
CREATE OR REPLACE VIEW guest_status AS
SELECT
  g.id,
  g.invite_code,
  g.display_name,
  g.guest_group,
  g.allowed_guests,
  g.phone,
  r.id          AS rsvp_id,
  r.full_name   AS rsvp_full_name,
  r.attending,
  r.guest_count,
  r.message,
  r.created_at  AS responded_at,
  CASE
    WHEN r.id IS NULL THEN 'pendiente'
    WHEN r.attending THEN 'confirmado'
    ELSE 'no asiste'
  END AS status
FROM guests g
LEFT JOIN rsvp_responses r ON r.guest_id = g.id
ORDER BY g.display_name;

-- ============================================================
-- Cómo cargar tu lista de invitados: edita esto con tus datos reales y
-- corre el bloque (puedes repetirlo en tandas, agregando más adelante).
-- El invite_code es lo único que debe ser único por fila — el que tú
-- inventes, sin espacios ni acentos (ej. apellido + año).
-- ============================================================
-- INSERT INTO guests (invite_code, display_name, guest_group, allowed_guests, phone) VALUES
--   ('PEREZ2026',  'Familia Pérez García', 'Familia', 4, '+502 5555 0001'),
--   ('LOPEZ2026',  'Ana López',            'Amigos',  2, '+502 5555 0002'),
--   ('GARCIA2026', 'Carlos García',        'Trabajo', 1, NULL);

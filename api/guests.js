const { sql } = require("@vercel/postgres");
const { isAuthenticated } = require("./_lib/auth");

// Lista + alta/edición/baja de invitados (todo protegido, para el panel admin).
module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (req.method === "GET") return handleList(req, res);
  if (req.method === "POST") return handleCreate(req, res);
  if (req.method === "PUT") return handleUpdate(req, res);
  if (req.method === "DELETE") return handleDelete(req, res);

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "method-not-allowed" });
};

async function handleList(req, res) {
  try {
    const { rows } = await sql`
      SELECT id, invite_code, display_name, guest_group, allowed_guests, phone,
             rsvp_id, attending, guest_count, message, responded_at, status
      FROM guest_status
    `;
    return res.status(200).json({ guests: rows });
  } catch (err) {
    console.error("guests list failed", err);
    return res.status(500).json({ error: "server-error" });
  }
}

// A partir del nombre arma un invite_code legible (sin acentos/espacios) y,
// si ya existe, le agrega un sufijo hasta encontrar uno libre.
function baseCodeFromName(name) {
  // NFD separa la letra de su acento (e.g. "é" -> "e" + acento combinante);
  // el filtro [^A-Z0-9] se queda solo con la letra y descarta el acento.
  const clean = name
    .normalize("NFD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return (clean || "INVITADO").slice(0, 24);
}

async function uniqueInviteCode(name) {
  const base = baseCodeFromName(name);
  let candidate = `${base}2026`;
  for (let attempt = 0; attempt < 20; attempt++) {
    const { rows } = await sql`SELECT 1 FROM guests WHERE invite_code = ${candidate} LIMIT 1`;
    if (!rows.length) return candidate;
    candidate = `${base}${2026 + attempt + 1}`;
  }
  // último recurso, prácticamente imposible de chocar
  return `${base}${Date.now()}`;
}

function parseGuestPayload(body) {
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 120) : "";
  const guestGroup = typeof body.guestGroup === "string" ? body.guestGroup.trim().slice(0, 60) || null : null;
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) || null : null;
  const allowedGuests = Math.max(1, Math.min(30, Number(body.allowedGuests) || 1));
  return { displayName, guestGroup, phone, allowedGuests };
}

async function handleCreate(req, res) {
  try {
    const { displayName, guestGroup, phone, allowedGuests } = parseGuestPayload(req.body || {});
    if (!displayName) return res.status(400).json({ error: "display-name-required" });

    const inviteCode = await uniqueInviteCode(displayName);

    const { rows } = await sql`
      INSERT INTO guests (invite_code, display_name, guest_group, allowed_guests, phone)
      VALUES (${inviteCode}, ${displayName}, ${guestGroup}, ${allowedGuests}, ${phone})
      RETURNING id, invite_code
    `;
    return res.status(201).json({ ok: true, id: rows[0].id, inviteCode: rows[0].invite_code });
  } catch (err) {
    console.error("guest create failed", err);
    return res.status(500).json({ error: "server-error" });
  }
}

async function handleUpdate(req, res) {
  try {
    const id = Number(req.body?.id);
    if (!id) return res.status(400).json({ error: "id-required" });

    const { displayName, guestGroup, phone, allowedGuests } = parseGuestPayload(req.body || {});
    if (!displayName) return res.status(400).json({ error: "display-name-required" });

    const { rowCount } = await sql`
      UPDATE guests
      SET display_name = ${displayName},
          guest_group = ${guestGroup},
          phone = ${phone},
          allowed_guests = ${allowedGuests}
      WHERE id = ${id}
    `;
    if (!rowCount) return res.status(404).json({ error: "not-found" });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("guest update failed", err);
    return res.status(500).json({ error: "server-error" });
  }
}

async function handleDelete(req, res) {
  try {
    const id = Number(req.query?.id || req.body?.id);
    if (!id) return res.status(400).json({ error: "id-required" });

    const { rowCount } = await sql`DELETE FROM guests WHERE id = ${id}`;
    if (!rowCount) return res.status(404).json({ error: "not-found" });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("guest delete failed", err);
    return res.status(500).json({ error: "server-error" });
  }
}

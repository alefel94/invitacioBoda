const { sql } = require("@vercel/postgres");
const { isAuthenticated } = require("./_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method === "POST") return handleCreate(req, res);
  if (req.method === "GET") return handleList(req, res);

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "method-not-allowed" });
};

async function handleCreate(req, res) {
  try {
    const { fullName, attending, guestCount, message, inviteCode } = req.body || {};

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return res.status(400).json({ error: "full-name-required" });
    }

    // si viene un código de invitación, la respuesta queda ligada a esa
    // invitación y el número de personas se limita a sus boletos asignados
    let guestId = null;
    let allowedGuests = 10;

    if (typeof inviteCode === "string" && inviteCode.trim()) {
      const { rows } = await sql`
        SELECT id, allowed_guests FROM guests WHERE invite_code = ${inviteCode.trim()} LIMIT 1
      `;
      if (!rows.length) return res.status(404).json({ error: "invite-not-found" });
      guestId = rows[0].id;
      allowedGuests = rows[0].allowed_guests;
    }

    const isAttending = Boolean(attending);
    const safeGuestCount = isAttending ? Math.max(1, Math.min(allowedGuests, Number(guestCount) || 1)) : 0;
    const safeMessage = typeof message === "string" ? message.trim().slice(0, 500) : "";
    const safeName = fullName.trim().slice(0, 120);

    if (guestId) {
      // una sola fila por invitación: si ya había confirmado, se actualiza
      await sql`
        INSERT INTO rsvp_responses (guest_id, full_name, attending, guest_count, message)
        VALUES (${guestId}, ${safeName}, ${isAttending}, ${safeGuestCount}, ${safeMessage})
        ON CONFLICT (guest_id) WHERE guest_id IS NOT NULL
        DO UPDATE SET
          full_name = EXCLUDED.full_name,
          attending = EXCLUDED.attending,
          guest_count = EXCLUDED.guest_count,
          message = EXCLUDED.message,
          created_at = NOW()
      `;
    } else {
      await sql`
        INSERT INTO rsvp_responses (full_name, attending, guest_count, message)
        VALUES (${safeName}, ${isAttending}, ${safeGuestCount}, ${safeMessage})
      `;
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("rsvp insert failed", err);
    return res.status(500).json({ error: "server-error" });
  }
}

async function handleList(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const { rows } = await sql`
      SELECT id, full_name, attending, guest_count, message, created_at
      FROM rsvp_responses
      ORDER BY created_at DESC
    `;
    return res.status(200).json({ rsvps: rows });
  } catch (err) {
    console.error("rsvp list failed", err);
    return res.status(500).json({ error: "server-error" });
  }
}

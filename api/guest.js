const { sql } = require("@vercel/postgres");

// Búsqueda pública por código de invitación (para precargar el nombre y
// limitar el número de boletos en el formulario de RSVP).
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method-not-allowed" });
  }

  const code = String(req.query.code || "").trim();
  if (!code) return res.status(400).json({ error: "code-required" });

  try {
    const { rows } = await sql`
      SELECT display_name, allowed_guests, rsvp_id, rsvp_full_name, attending, guest_count
      FROM guest_status
      WHERE invite_code = ${code}
      LIMIT 1
    `;
    if (!rows.length) return res.status(404).json({ error: "not-found" });

    const guest = rows[0];
    return res.status(200).json({
      displayName: guest.display_name,
      allowedGuests: guest.allowed_guests,
      previousResponse: guest.rsvp_id
        ? {
            fullName: guest.rsvp_full_name,
            attending: guest.attending,
            guestCount: guest.guest_count,
          }
        : null,
    });
  } catch (err) {
    console.error("guest lookup failed", err);
    return res.status(500).json({ error: "server-error" });
  }
};

const { sql } = require("@vercel/postgres");

// Lista pública y liviana de invitados (solo nombre + código + boletos) para
// el autocompletado del campo "Nombre" en el RSVP. Sin teléfono ni mensajes.
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method-not-allowed" });
  }

  try {
    const { rows } = await sql`
      SELECT invite_code, display_name, allowed_guests FROM guests ORDER BY display_name
    `;
    return res.status(200).json({
      guests: rows.map((g) => ({
        inviteCode: g.invite_code,
        displayName: g.display_name,
        allowedGuests: g.allowed_guests,
      })),
    });
  } catch (err) {
    console.error("guest directory failed", err);
    return res.status(500).json({ error: "server-error" });
  }
};

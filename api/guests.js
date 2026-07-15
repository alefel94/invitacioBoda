const { sql } = require("@vercel/postgres");
const { isAuthenticated } = require("./_lib/auth");

// Lista completa de invitados con su estado (protegida, para el panel admin).
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method-not-allowed" });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }

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
};

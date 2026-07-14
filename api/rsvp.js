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
    const { fullName, attending, guestCount, message } = req.body || {};

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return res.status(400).json({ error: "full-name-required" });
    }

    const isAttending = Boolean(attending);
    const safeGuestCount = isAttending ? Math.max(1, Math.min(10, Number(guestCount) || 1)) : 0;
    const safeMessage = typeof message === "string" ? message.trim().slice(0, 500) : "";

    await sql`
      INSERT INTO rsvp_responses (full_name, attending, guest_count, message)
      VALUES (${fullName.trim().slice(0, 120)}, ${isAttending}, ${safeGuestCount}, ${safeMessage})
    `;

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

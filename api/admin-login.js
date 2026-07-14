const crypto = require("crypto");
const { createSessionCookie } = require("./_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method-not-allowed" });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !process.env.SESSION_SECRET) {
    console.error("ADMIN_PASSWORD / SESSION_SECRET no están configuradas");
    return res.status(500).json({ error: "server-not-configured" });
  }

  const { password } = req.body || {};
  const provided = Buffer.from(String(password || ""));
  const expected = Buffer.from(adminPassword);
  const matches = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

  if (!matches) {
    return res.status(401).json({ error: "invalid-password" });
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  return res.status(200).json({ ok: true });
};

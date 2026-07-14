// Autenticación mínima para el panel de admin: una sola contraseña
// (ADMIN_PASSWORD) + cookie de sesión firmada con HMAC (SESSION_SECRET).
// Sin librerías externas ni cuentas de usuario: es solo para el dueño del sitio.

const crypto = require("crypto");

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function createSessionCookie() {
  const secret = process.env.SESSION_SECRET;
  const expires = Date.now() + SESSION_TTL_MS;
  const token = `${expires}.${sign(String(expires), secret)}`;
  const isProd = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "development";

  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  });
  return out;
}

function isAuthenticated(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return false;

  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (Date.now() > Number(expires)) return false;

  const expected = sign(expires, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { createSessionCookie, clearSessionCookie, isAuthenticated };

import bcrypt from "bcryptjs";
import crypto from "crypto";
import express from "express";
import { getDbPool } from "../db.js";
import { env } from "../env.js";
import { sendResetEmail } from "../email.js";
import { sendResetEmailSendGrid } from "../emailSendGrid.js";

const router = express.Router();

// Simple in-memory session cookie name
const SESSION_COOKIE = "sid";

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

router.post("/signup", async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password || !displayName) {
      return res
        .status(400)
        .json({ error: "email, password, displayName required" });
    }
    const db = getDbPool();
    const [[existing]] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existing)
      return res.status(409).json({ error: "email already in use" });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (email, password_hash, display_name) VALUES (?,?,?)",
      [email, hash, displayName],
    );
    const userId = result.insertId;

    // Create default personal board
    await db.query("INSERT INTO boards (name, owner_user_id) VALUES (?,?)", [
      "My Board",
      userId,
    ]);

    // Create session
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await db.query(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES (?,?,?)",
      [userId, token, expires],
    );
    setSessionCookie(res, token);
    res.status(201).json({ id: userId, email, displayName });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { identifier, email, password } = req.body || {};
    const idOrEmail = (identifier || email || "").trim();
    if (!idOrEmail || !password)
      return res
        .status(400)
        .json({ error: "identifier/email and password required" });
    const db = getDbPool();
    const [[user]] = await db.query(
      "SELECT id, password_hash, display_name FROM users WHERE email = ? OR display_name = ?",
      [idOrEmail, idOrEmail],
    );
    if (!user) return res.status(401).json({ error: "invalid credentials" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await db.query(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES (?,?,?)",
      [user.id, token, expires],
    );
    setSessionCookie(res, token);
    res.json({ id: user.id, email, displayName: user.display_name });
  } catch (e) {
    next(e);
  }
});

router.post("/logout", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    try {
      await getDbPool().query("DELETE FROM sessions WHERE token = ?", [token]);
    } catch {}
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.status(204).end();
});

// Request password reset (email only; always 204)
router.post("/forgot", async (req, res) => {
  const { email } = req.body || {};
  if (typeof email === "string" && email.trim()) {
    try {
      const db = getDbPool();
      const [[user]] = await db.query("SELECT id FROM users WHERE email = ?", [
        email.trim(),
      ]);
      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        await db.query(
          "INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?,?,?)",
          [user.id, token, expires],
        );
        const frontendBase =
          env.FRONTEND_BASE_URL || "http://localhost:5174";
        const resetUrl = `${frontendBase}/?token=${token}`;
        const sentSes = await sendResetEmail({ to: email.trim(), resetUrl });
        const sentSg = sentSes
          ? true
          : await sendResetEmailSendGrid({ to: email.trim(), resetUrl });
        if (!sentSes && !sentSg) {
          // Fallback: still log for dev if email sending not configured
          console.log(`[reset-link] token=${token} url=${resetUrl}`);
        }
      }
    } catch (e) {
      console.error("forgot failed", e);
    }
  }
  res.status(204).end();
});

// Verify reset token
router.get("/reset/verify", async (req, res) => {
  const token = String(req.query.token || "").trim();
  if (!token) return res.status(400).json({ error: "token required" });
  const db = getDbPool();
  const [[row]] = await db.query(
    "SELECT user_id FROM reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > NOW()",
    [token],
  );
  if (!row) return res.status(400).json({ error: "invalid or expired token" });
  res.json({ ok: true });
});

// Perform password reset
router.post("/reset", async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword)
    return res.status(400).json({ error: "token and newPassword required" });
  const db = getDbPool();
  const [[rt]] = await db.query(
    "SELECT user_id FROM reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > NOW()",
    [token],
  );
  if (!rt) return res.status(400).json({ error: "invalid or expired token" });
  const hash = await bcrypt.hash(newPassword, 10);
  await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [
    hash,
    rt.user_id,
  ]);
  await db.query("UPDATE reset_tokens SET used_at = NOW() WHERE token = ?", [
    token,
  ]);
  await db.query("DELETE FROM sessions WHERE user_id = ?", [rt.user_id]);
  res.status(204).end();
});

router.get("/me", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: "unauthorized" });
  const db = getDbPool();
  const [[row]] = await db.query(
    `SELECT u.id, u.email, u.display_name
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()`,
    [token],
  );
  if (!row) return res.status(401).json({ error: "unauthorized" });
  res.json({ id: row.id, email: row.email, displayName: row.display_name });
});

export default router;

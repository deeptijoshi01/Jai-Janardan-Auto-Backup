const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const AdminSession = require("../models/AdminSession");
const AdminUser = require("../models/AdminUser");
const {
  cookieName,
  hashSessionToken,
  requireAdmin,
} = require("../middleware/requireAdmin");
const { hashPassword, verifyPassword } = require("../utils/adminPassword");
const { createRateLimiter } = require("../utils/adminRateLimit");
const { getSmtpConfiguration } = require("../utils/smtpConfig");

const router = express.Router();
const REMEMBERED_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const BROWSER_SESSION_MS = 12 * 60 * 60 * 1000;
const RESET_TOKEN_MS = 15 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_RESET_MESSAGE =
  "If an account matches that email address, password reset instructions will be sent shortly.";

const loginLimiter = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  message: "Too many sign-in attempts. Please wait and try again.",
});
const resetRequestLimiter = createRateLimiter({
  limit: 3,
  windowMs: 15 * 60 * 1000,
  message: "Too many reset requests. Please wait before trying again.",
});
const resetPasswordLimiter = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  message: "Too many password reset attempts. Please wait and try again.",
});

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const validEmail = (value) =>
  value.length <= 254 && EMAIL_PATTERN.test(value);

const safeEqual = (provided, expected) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

const publicAdmin = (user) => ({
  id: String(user._id),
  name: user.fullName || user.name || user.email.split("@")[0],
  email: user.email,
  role: user.role,
  profileImage: user.profileImage || "",
});

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.COOKIE_SAME_SITE || "lax").toLowerCase(),
  path: "/",
});

const readRememberMe = (value) => value === true;

const issueSession = async (user, rememberMe, res) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + (rememberMe ? REMEMBERED_SESSION_MS : BROWSER_SESSION_MS)
  );
  await AdminSession.create({
    userId: user._id,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });

  const options = cookieOptions();
  if (rememberMe) options.expires = expiresAt;
  res.cookie(cookieName, token, options);
};

const getOrCreateConfiguredAdmin = async (email, password) => {
  let user = await AdminUser.findOne({ email }).select("+passwordHash");
  if (user) return user;

  const configuredEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  const configuredPassword = process.env.ADMIN_PASSWORD || "";
  if (
    !configuredEmail ||
    !configuredPassword ||
    email !== configuredEmail ||
    !safeEqual(password, configuredPassword)
  ) {
    return null;
  }

  const fullName =
    (typeof process.env.ADMIN_NAME === "string" && process.env.ADMIN_NAME.trim()) ||
    email.split("@")[0];
  try {
    user = await AdminUser.create({
      fullName,
      email,
      passwordHash: await hashPassword(configuredPassword),
      role: "admin",
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    user = await AdminUser.findOne({ email }).select("+passwordHash");
  }
  return user;
};

router.post("/login", loginLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!validEmail(email) || password.length < 1 || password.length > 1024) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid email address and password.",
    });
  }

  let user = await AdminUser.findOne({ email }).select("+passwordHash");
  if (!user && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
    return res.status(503).json({
      success: false,
      message: "Admin sign-in is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env for the initial account.",
    });
  }
  if (!user) user = await getOrCreateConfiguredAdmin(email, password);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({
      success: false,
      message: "That email and password don't match. Try again.",
    });
  }

  await issueSession(user, readRememberMe(req.body?.rememberMe), res);
  return res.json({ success: true, user: publicAdmin(user) });
});

router.post("/forgot-password", resetRequestLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!validEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid email address.",
    });
  }

  const mailConfig = getSmtpConfiguration();
  if (mailConfig.missing?.length) {
    console.error(
      `Password reset SMTP configuration missing: ${mailConfig.missing.join(", ")}`
    );
    return res.status(503).json({
      success: false,
      message: `Password reset email is not configured. Set ${mailConfig.missing.join(", ")} in backend/.env.`,
    });
  }
  if (mailConfig.error) {
    console.error(`Password reset SMTP configuration error: ${mailConfig.error}`);
    return res.status(503).json({ success: false, message: mailConfig.error });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: mailConfig.port,
    secure: mailConfig.port === 465,
    requireTLS: process.env.NODE_ENV === "production" && mailConfig.port !== 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  try {
    await transporter.verify();
  } catch (error) {
    console.error("Password reset SMTP connection failed:", error.code || error.name);
    return res.status(503).json({
      success: false,
      message: "Password reset email service is unavailable. Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in backend/.env.",
    });
  }

  const user = await AdminUser.findOne({ email });
  if (!user) return res.json({ success: true, message: GENERIC_RESET_MESSAGE });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_MS);
  await AdminUser.updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt } }
  );

  const resetUrl = new URL("/admin/reset-password", mailConfig.frontendUrl);
  resetUrl.searchParams.set("token", rawToken);
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject: "Reset your Jai Janardan Auto admin password",
      text: `A password reset was requested for your admin account. The link expires in 15 minutes and can only be used once:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>A password reset was requested for your admin account.</p><p><a href="${resetUrl.toString()}">Reset your password</a></p><p>This link expires in 15 minutes and can only be used once. If you did not request this, you can ignore this email.</p>`,
    });
  } catch (error) {
    await AdminUser.updateOne(
      { _id: user._id, resetTokenHash: tokenHash },
      { $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 } }
    );
    console.error("Password reset email delivery failed:", error.code || error.name);
    return res.status(502).json({
      success: false,
      message: "Unable to deliver the reset email. Please try again later.",
    });
  }

  return res.json({ success: true, message: GENERIC_RESET_MESSAGE });
});

router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({
      success: false,
      message: "This password reset link is invalid or has expired.",
    });
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({
      success: false,
      message: "Choose a password with at least 12 characters and no more than 72 UTF-8 bytes.",
    });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const passwordHash = await hashPassword(password);
  const transaction = await mongoose.startSession();
  let user;
  try {
    await transaction.withTransaction(async () => {
      user = await AdminUser.findOneAndUpdate(
        {
          resetTokenHash: tokenHash,
          resetTokenExpiresAt: { $gt: new Date() },
        },
        {
          $set: { passwordHash, passwordChangedAt: new Date() },
          $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 },
        },
        { new: true, session: transaction }
      );
      if (user) {
        await AdminSession.deleteMany({ userId: user._id }, { session: transaction });
      }
    });
  } finally {
    await transaction.endSession();
  }
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "This password reset link is invalid or has expired.",
    });
  }

  await AdminSession.deleteMany({ userId: user._id });
  return res.json({
    success: true,
    message: "Your password has been reset. Sign in with your new password.",
  });
});

router.get("/me", requireAdmin, (req, res) => {
  res.json({ success: true, user: publicAdmin(req.admin) });
});

router.get("/session", requireAdmin, (req, res) => {
  res.json({ success: true, user: publicAdmin(req.admin) });
});

router.post("/logout", async (req, res) => {
  res.clearCookie(cookieName, cookieOptions());
  const token = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (token && /^[a-f0-9]{64}$/i.test(token)) {
    await AdminSession.deleteOne({ tokenHash: hashSessionToken(token) });
  }
  return res.json({ success: true, message: "Signed out successfully." });
});

module.exports = router;

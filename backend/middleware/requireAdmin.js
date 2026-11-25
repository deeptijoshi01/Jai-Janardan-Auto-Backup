const crypto = require("crypto");
const AdminUser = require("../models/AdminUser");
const AdminSession = require("../models/AdminSession");

const isProduction = process.env.NODE_ENV === "production";
const cookieName = isProduction ? "__Host-jja_admin" : "jja_admin";

const readSessionCookie = (req) => {
  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  return cookie ? cookie.slice(cookieName.length + 1) : "";
};

const hashSessionToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const requireAdmin = async (req, res, next) => {
  const token = readSessionCookie(req);
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(401).json({
      success: false,
      message: "Admin sign-in is required.",
    });
  }

  const session = await AdminSession.findOne({
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) {
    return res.status(401).json({
      success: false,
      message: "Admin session has expired. Please sign in again.",
    });
  }

  const user = await AdminUser.findById(session.userId)
    .select("_id fullName name email role profileImage")
    .lean();
  if (!user || !["admin", "staff"].includes(user.role)) {
    await AdminSession.deleteOne({ _id: session._id });
    return res.status(401).json({
      success: false,
      message: "Admin sign-in is required.",
    });
  }

  req.admin = user;
  req.adminSession = session;
  return next();
};

module.exports = { cookieName, hashSessionToken, requireAdmin };

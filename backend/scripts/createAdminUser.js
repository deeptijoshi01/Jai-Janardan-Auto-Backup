const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const AdminUser = require("../models/AdminUser");
const { hashPassword } = require("../utils/adminPassword");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const run = async () => {
  const email = (process.env.NEW_ADMIN_EMAIL || "").trim().toLowerCase();
  const fullName = (process.env.NEW_ADMIN_NAME || "").trim();
  const password = process.env.NEW_ADMIN_PASSWORD || "";
  const role = process.env.NEW_ADMIN_ROLE || "staff";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Set a valid NEW_ADMIN_EMAIL.");
  }
  if (!fullName || fullName.length > 120) {
    throw new Error("Set NEW_ADMIN_NAME to a name of at most 120 characters.");
  }
  if (
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error("NEW_ADMIN_PASSWORD must be at least 12 characters and no more than 72 UTF-8 bytes.");
  }
  if (!["admin", "staff"].includes(role)) {
    throw new Error("NEW_ADMIN_ROLE must be admin or staff.");
  }
  if (!process.env.MONGO_URI) {
    throw new Error("Set MONGO_URI in backend/.env.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  await AdminUser.create({
    fullName,
    email,
    passwordHash: await hashPassword(password),
    role,
  });
  console.log(`Created ${role} account for ${email}.`);
};

run()
  .catch((error) => {
    if (error.code === 11000) {
      console.error("An admin account with that email already exists.");
    } else {
      console.error(error.message);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

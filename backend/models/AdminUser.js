const mongoose = require("mongoose");

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    fullName: { type: String, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "staff"], default: "admin", required: true },
    profileImage: { type: String, default: "" },
    resetTokenHash: { type: String, default: undefined, select: false },
    resetTokenExpiresAt: { type: Date, default: undefined, select: false },
    passwordChangedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminUser", adminUserSchema);

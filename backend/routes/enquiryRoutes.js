const express = require("express");
const Enquiry = require("../models/Enquiry");
const { requireAdmin } = require("../middleware/requireAdmin");
const { createRateLimiter } = require("../utils/adminRateLimit");

const router = express.Router();
const createEnquiryLimiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
  message: "Too many enquiries were submitted. Please wait and try again.",
});
const statuses = ["New", "Contacted", "Interested"];
const interests = [
  "Buying a Vehicle",
  "Selling My Vehicle",
  "Vehicle Finance",
  "General Enquiry",
];

router.post("/", createEnquiryLimiter, async (req, res) => {
  const { name, phone, interest, message } = req.body || {};
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 120 ||
    typeof phone !== "string" ||
    !/^\+?[0-9][0-9\s()-]{7,22}$/.test(phone.trim()) ||
    typeof interest !== "string" ||
    !interests.includes(interest) ||
    typeof message !== "string" ||
    message.trim().length < 8 ||
    message.trim().length > 2000
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid name, phone number, enquiry type, and message.",
    });
  }

  try {
    const enquiry = await Enquiry.create({
      name: name.trim(),
      phone: phone.trim(),
      interest,
      message: message.trim(),
    });
    return res.status(201).json({
      success: true,
      message: "Enquiry received successfully.",
      enquiry: { id: String(enquiry._id) },
    });
  } catch (error) {
    console.error("Create enquiry failed:", error.name);
    return res.status(500).json({
      success: false,
      message: "Unable to save your enquiry right now.",
    });
  }
});

router.get("/", requireAdmin, async (req, res) => {
  try {
    const enquiries = await Enquiry.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({
      success: true,
      count: enquiries.length,
      enquiries,
    });
  } catch (error) {
    console.error("Load enquiries failed:", error.name);
    return res.status(500).json({
      success: false,
      message: "Unable to load enquiries.",
    });
  }
});

router.patch("/:id/status", requireAdmin, async (req, res) => {
  if (!statuses.includes(req.body?.status)) {
    return res.status(400).json({
      success: false,
      message: "Choose a valid enquiry status.",
    });
  }
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { $set: { status: req.body.status } },
      { new: true, runValidators: true }
    );
    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found.",
      });
    }
    return res.json({ success: true, enquiry });
  } catch (error) {
    console.error("Update enquiry status failed:", error.name);
    return res.status(400).json({
      success: false,
      message: "Unable to update enquiry status.",
    });
  }
});

module.exports = router;

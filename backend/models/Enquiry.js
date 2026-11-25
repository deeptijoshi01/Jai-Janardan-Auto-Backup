const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 24 },
    interest: {
      type: String,
      required: true,
      enum: [
        "Buying a Vehicle",
        "Selling My Vehicle",
        "Vehicle Finance",
        "General Enquiry",
      ],
    },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["New", "Contacted", "Interested"],
      default: "New",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enquiry", enquirySchema);

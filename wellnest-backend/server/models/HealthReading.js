import mongoose from "mongoose";

const healthReadingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  value: { type: String, required: true, trim: true, maxlength: 80 },
  unit: { type: String, trim: true, maxlength: 40, default: "" },
  recordedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const HealthReading = mongoose.models.HealthReading || mongoose.model("HealthReading", healthReadingSchema);

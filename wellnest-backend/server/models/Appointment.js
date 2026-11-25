import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  provider: { type: String, trim: true, maxlength: 120, default: "" },
  specialty: { type: String, trim: true, maxlength: 100, default: "" },
  date: { type: String, required: true },
  time: { type: String, required: true, trim: true, maxlength: 40 },
  type: { type: String, enum: ["In person", "Virtual"], default: "In person" }
}, { timestamps: true });

export const Appointment = mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);

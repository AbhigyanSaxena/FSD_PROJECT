import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  detail: { type: String, trim: true, maxlength: 240, default: "As prescribed" },
  time: { type: String, required: true, trim: true, maxlength: 40 },
  takenOn: { type: String, default: "" },
  takenDates: { type: [String], default: [] }
}, { timestamps: true });

export const Medication = mongoose.models.Medication || mongoose.model("Medication", medicationSchema);

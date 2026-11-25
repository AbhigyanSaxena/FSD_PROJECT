import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { PORT, JWT_SECRET } from "./config/env.js";
import { connectDatabase, isDatabaseEnabled } from "./db.js";
import { User } from "./models/User.js";
import { Medication } from "./models/Medication.js";
import { Appointment } from "./models/Appointment.js";
import { HealthReading } from "./models/HealthReading.js";

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5174,http://127.0.0.1:5174,http://localhost:5173,http://127.0.0.1:5173").split(",").map(origin => origin.trim());
app.use(cors({
  origin(origin, callback) {
    let localDevelopmentOrigin = false;
    try {
      const parsed = new URL(origin);
      localDevelopmentOrigin = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
    } catch {}
    if (!origin || allowedOrigins.includes(origin) || localDevelopmentOrigin) return callback(null, true);
    return callback(new Error("Origin is not allowed."));
  }
}));
app.use(express.json({ limit: "32kb" }));

const users = [];
const memory = { medications: [], appointments: [], readings: [] };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!value) return res.status(401).json({ message: "Sign in to continue." });
  try {
    req.user = jwt.verify(value, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}

function serialize(document) {
  const value = typeof document.toObject === "function" ? document.toObject() : document;
  const { _id, __v, ...fields } = value;
  return { id: String(_id || value.id), ...fields };
}

function validId(id) {
  return !isDatabaseEnabled() || mongoose.isValidObjectId(id);
}

function removeOwned(items, id, userId) {
  const index = items.findIndex(item => item._id === id && item.userId === userId);
  return index < 0 ? null : items.splice(index, 1)[0];
}

function validDateOnly(value) {
  if (!datePattern.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateText(value, label, maxLength = 120) {
  if (typeof value !== "string" || !value.trim()) return `${label} is required.`;
  if (value.trim().length > maxLength) return `${label} must be ${maxLength} characters or fewer.`;
  return "";
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", storage: isDatabaseEnabled() ? "mongodb" : "memory" }));

app.post("/api/auth/register", async (req, res) => {
  const nameError = validateText(req.body.name, "Name", 100);
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (nameError || !emailPattern.test(email) || password.length < 8) {
    return res.status(400).json({ message: nameError || "Enter a valid email and a password with at least 8 characters." });
  }

  const exists = isDatabaseEnabled()
    ? await User.exists({ email })
    : users.some(user => user.email === email);
  if (exists) return res.status(409).json({ message: "An account with this email already exists." });

  const user = { id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: req.body.name.trim(), email, password: await bcrypt.hash(password, 12) };
  if (isDatabaseEnabled()) {
    const saved = await User.create({ name: user.name, email, password: user.password });
    user.id = saved._id.toString();
  } else {
    users.push(user);
  }

  return res.status(201).json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/login", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const databaseUser = isDatabaseEnabled() ? await User.findOne({ email }).lean() : null;
  const user = databaseUser
    ? { id: databaseUser._id.toString(), ...databaseUser }
    : users.find(item => item.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }
  return res.json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email } });
});

app.get("/api/medications", requireAuth, async (req, res) => {
  const date = req.query.date ? req.query.date : new Date().toISOString().slice(0, 10);
  if (!validDateOnly(date)) return res.status(400).json({ message: "Enter the date as YYYY-MM-DD." });
  const items = isDatabaseEnabled()
    ? await Medication.find({ userId: req.user.id }).sort({ time: 1 }).lean()
    : memory.medications.filter(item => item.userId === req.user.id).sort((a, b) => a.time.localeCompare(b.time));
  return res.json(items.map(item => ({ ...serialize(item), taken: item.takenDates?.includes(date) || item.takenOn === date })));
});

app.post("/api/medications", requireAuth, async (req, res) => {
  const nameError = validateText(req.body.name, "Medication name");
  const timeError = validateText(req.body.time, "Reminder time", 40);
  if (nameError || timeError) return res.status(400).json({ message: nameError || timeError });
  const item = { userId: req.user.id, name: req.body.name.trim(), detail: typeof req.body.detail === "string" && req.body.detail.trim() ? req.body.detail.trim().slice(0, 240) : "As prescribed", time: req.body.time.trim(), takenOn: "", takenDates: [] };
  const saved = isDatabaseEnabled() ? await Medication.create(item) : { _id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...item, createdAt: new Date(), updatedAt: new Date() };
  if (!isDatabaseEnabled()) memory.medications.push(saved);
  return res.status(201).json({ ...serialize(saved), taken: false });
});

app.patch("/api/medications/:id", requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Medication not found." });
  const doseStatusOnly = typeof req.body.taken === "boolean" && Object.keys(req.body).every(key => ["taken", "date"].includes(key));
  let item;
  if (doseStatusOnly) {
    const date = req.body.date || new Date().toISOString().slice(0, 10);
    if (!validDateOnly(date)) return res.status(400).json({ message: "Enter the dose date as YYYY-MM-DD." });
    if (isDatabaseEnabled()) {
      const update = req.body.taken
        ? { $addToSet: { takenDates: date }, $set: { takenOn: date } }
        : { $pull: { takenDates: date }, $set: { takenOn: "" } };
      item = await Medication.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        update,
        { new: true, runValidators: true }
      ).lean();
    } else {
      item = memory.medications.find(value => value._id === req.params.id && value.userId === req.user.id);
      if (item) {
        const dates = item.takenDates || (item.takenOn ? [item.takenOn] : []);
        item.takenDates = req.body.taken
          ? [...new Set([...dates, date])]
          : dates.filter(value => value !== date);
        item.takenOn = req.body.taken ? date : (item.takenOn === date ? "" : item.takenOn);
        item.updatedAt = new Date();
      }
    }
    if (!item) return res.status(404).json({ message: "Medication not found." });
    return res.json({ ...serialize(item), taken: item.takenDates?.includes(date) || item.takenOn === date });
  }

  const updates = {};
  if (Object.hasOwn(req.body, "name")) {
    const error = validateText(req.body.name, "Medication name");
    if (error) return res.status(400).json({ message: error });
    updates.name = req.body.name.trim();
  }
  if (Object.hasOwn(req.body, "time")) {
    const error = validateText(req.body.time, "Reminder time", 40);
    if (error) return res.status(400).json({ message: error });
    updates.time = req.body.time.trim();
  }
  if (Object.hasOwn(req.body, "detail")) {
    if (typeof req.body.detail !== "string" || req.body.detail.length > 240) return res.status(400).json({ message: "Dosage or notes must be 240 characters or fewer." });
    updates.detail = req.body.detail.trim();
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide a medication field to update." });
  if (isDatabaseEnabled()) {
    item = await Medication.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: updates }, { new: true, runValidators: true }).lean();
  } else {
    item = memory.medications.find(value => value._id === req.params.id && value.userId === req.user.id);
    if (item) { Object.assign(item, updates, { updatedAt: new Date() }); }
  }
  if (!item) return res.status(404).json({ message: "Medication not found." });
  return res.json(serialize(item));
});

app.get("/api/medications/:id/history", requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Medication not found." });
  const item = isDatabaseEnabled()
    ? await Medication.findOne({ _id: req.params.id, userId: req.user.id }).select("takenOn takenDates").lean()
    : memory.medications.find(value => value._id === req.params.id && value.userId === req.user.id);
  if (!item) return res.status(404).json({ message: "Medication not found." });
  const dates = [...new Set([...(item.takenDates || []), ...(item.takenOn ? [item.takenOn] : [])])].sort();
  return res.json({ medicationId: req.params.id, takenDates: dates });
});

app.delete("/api/medications/:id", requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Medication not found." });
  const removed = isDatabaseEnabled()
    ? await Medication.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    : removeOwned(memory.medications, req.params.id, req.user.id);
  if (!removed) return res.status(404).json({ message: "Medication not found." });
  return res.status(204).end();
});

app.get("/api/appointments", requireAuth, async (req, res) => {
  const items = isDatabaseEnabled()
    ? await Appointment.find({ userId: req.user.id }).sort({ date: 1, time: 1 }).lean()
    : memory.appointments.filter(item => item.userId === req.user.id).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return res.json(items.map(serialize));
});

app.post("/api/appointments", requireAuth, async (req, res) => {
  const titleError = validateText(req.body.title, "Appointment title");
  const timeError = validateText(req.body.time, "Appointment time", 40);
  if (titleError || timeError || !validDateOnly(req.body.date)) {
    return res.status(400).json({ message: titleError || timeError || "Enter the appointment date as YYYY-MM-DD." });
  }
  const item = {
    userId: req.user.id, title: req.body.title.trim(), provider: typeof req.body.provider === "string" ? req.body.provider.trim().slice(0, 120) : "",
    specialty: typeof req.body.specialty === "string" ? req.body.specialty.trim().slice(0, 100) : "",
    date: req.body.date, time: req.body.time.trim(), type: req.body.type === "Virtual" ? "Virtual" : "In person"
  };
  const saved = isDatabaseEnabled() ? await Appointment.create(item) : { _id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...item, createdAt: new Date(), updatedAt: new Date() };
  if (!isDatabaseEnabled()) memory.appointments.push(saved);
  return res.status(201).json(serialize(saved));
});

app.patch("/api/appointments/:id", requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Appointment not found." });
  const updates = {};
  if (Object.hasOwn(req.body, "title")) {
    const error = validateText(req.body.title, "Appointment title");
    if (error) return res.status(400).json({ message: error });
    updates.title = req.body.title.trim();
  }
  for (const field of ["provider", "specialty"]) {
    if (Object.hasOwn(req.body, field)) {
      if (typeof req.body[field] !== "string" || req.body[field].length > (field === "provider" ? 120 : 100)) return res.status(400).json({ message: `${field === "provider" ? "Provider" : "Specialty"} must be text within the allowed length.` });
      updates[field] = req.body[field].trim();
    }
  }
  if (Object.hasOwn(req.body, "date")) {
    if (!validDateOnly(req.body.date)) return res.status(400).json({ message: "Enter the appointment date as YYYY-MM-DD." });
    updates.date = req.body.date;
  }
  if (Object.hasOwn(req.body, "time")) {
    const error = validateText(req.body.time, "Appointment time", 40);
    if (error) return res.status(400).json({ message: error });
    updates.time = req.body.time.trim();
  }
  if (Object.hasOwn(req.body, "type")) {
    if (!["In person", "Virtual"].includes(req.body.type)) return res.status(400).json({ message: "Visit type must be In person or Virtual." });
    updates.type = req.body.type;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide an appointment field to update." });
  let item;
  if (isDatabaseEnabled()) {
    item = await Appointment.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: updates }, { new: true, runValidators: true }).lean();
  } else {
    item = memory.appointments.find(value => value._id === req.params.id && value.userId === req.user.id);
    if (item) Object.assign(item, updates, { updatedAt: new Date() });
  }
  if (!item) return res.status(404).json({ message: "Appointment not found." });
  return res.json(serialize(item));
});

app.delete("/api/appointments/:id", requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Appointment not found." });
  const removed = isDatabaseEnabled()
    ? await Appointment.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    : removeOwned(memory.appointments, req.params.id, req.user.id);
  if (!removed) return res.status(404).json({ message: "Appointment not found." });
  return res.status(204).end();
});

app.get("/api/readings", requireAuth, async (req, res) => {
  const items = isDatabaseEnabled()
    ? await HealthReading.find({ userId: req.user.id }).sort({ recordedAt: -1 }).lean()
    : memory.readings.filter(item => item.userId === req.user.id).sort((a, b) => b.recordedAt - a.recordedAt);
  return res.json(items.map(serialize));
});

app.post("/api/readings", requireAuth, async (req, res) => {
  const labelError = validateText(req.body.label, "Reading name");
  const valueError = validateText(String(req.body.value ?? ""), "Reading value", 80);
  if (labelError || valueError) return res.status(400).json({ message: labelError || valueError });
  const item = {
    userId: req.user.id, label: req.body.label.trim(), value: String(req.body.value).trim(),
    unit: typeof req.body.unit === "string" ? req.body.unit.trim().slice(0, 40) : "",
    recordedAt: req.body.recordedAt ? new Date(req.body.recordedAt) : new Date()
  };
  if (Number.isNaN(item.recordedAt.getTime())) return res.status(400).json({ message: "Enter a valid reading date." });
  const saved = isDatabaseEnabled() ? await HealthReading.create(item) : { _id: `reading-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...item, createdAt: new Date(), updatedAt: new Date() };
  if (!isDatabaseEnabled()) memory.readings.push(saved);
  return res.status(201).json(serialize(saved));
});

app.patch("/api/readings/:id", requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Reading not found." });
  const updates = {};
  if (Object.hasOwn(req.body, "label")) {
    const error = validateText(req.body.label, "Reading name");
    if (error) return res.status(400).json({ message: error });
    updates.label = req.body.label.trim();
  }
  if (Object.hasOwn(req.body, "value")) {
    const error = validateText(String(req.body.value ?? ""), "Reading value", 80);
    if (error) return res.status(400).json({ message: error });
    updates.value = String(req.body.value).trim();
  }
  if (Object.hasOwn(req.body, "unit")) {
    if (typeof req.body.unit !== "string" || req.body.unit.length > 40) return res.status(400).json({ message: "Unit must be text within 40 characters." });
    updates.unit = req.body.unit.trim();
  }
  if (Object.hasOwn(req.body, "recordedAt")) {
    const date = new Date(req.body.recordedAt);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ message: "Enter a valid reading date." });
    updates.recordedAt = date;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide a reading field to update." });
  let item;
  if (isDatabaseEnabled()) {
    item = await HealthReading.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: updates }, { new: true, runValidators: true }).lean();
  } else {
    item = memory.readings.find(value => value._id === req.params.id && value.userId === req.user.id);
    if (item) Object.assign(item, updates, { updatedAt: new Date() });
  }
  if (!item) return res.status(404).json({ message: "Reading not found." });
  return res.json(serialize(item));
});

app.delete("/api/readings/:id", requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Reading not found." });
  const removed = isDatabaseEnabled()
    ? await HealthReading.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    : removeOwned(memory.readings, req.params.id, req.user.id);
  if (!removed) return res.status(404).json({ message: "Reading not found." });
  return res.status(204).end();
});

app.use((error, _req, res, _next) => {
  console.error("API request failed:", error.message);
  return res.status(500).json({ message: "The request could not be completed." });
});

connectDatabase().then(() => app.listen(PORT, () => console.log(`Wellnest API running on http://localhost:${PORT}`)));

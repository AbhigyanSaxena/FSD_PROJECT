import mongoose from "mongoose";
import { MONGODB_URI } from "./config/env.js";

let databaseEnabled = false;

export async function connectDatabase() {
  if (!MONGODB_URI) {
    console.log("MongoDB is not configured. Using temporary in-process memory storage.");
    return false;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    databaseEnabled = true;
    console.log("Connected to MongoDB successfully.");
    return true;
  } catch (error) {
    console.error("MongoDB connection failed. Falling back to temporary in-process memory storage.");
    console.error(error.message);
    databaseEnabled = false;
    return false;
  }
}

export function isDatabaseEnabled() {
  return databaseEnabled;
}

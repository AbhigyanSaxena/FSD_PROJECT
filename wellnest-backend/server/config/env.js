import "dotenv/config";
export const PORT = Number(process.env.PORT || 3001);
export const MONGODB_URI = process.env.MONGODB_URI || "";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const JWT_SECRET = process.env.JWT_SECRET || "development-only-change-me";

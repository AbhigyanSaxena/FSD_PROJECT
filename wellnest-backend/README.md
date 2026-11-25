# Wellnest backend

Express API for the Wellnest personal health tracker. It provides account registration and sign-in, medication reminders and dose history, appointments, health readings, and a health check endpoint.

## Run locally

1. Install Node.js 20 or later.
2. From this directory, run `npm install`.
3. Copy `.env.example` to `.env` and set a MongoDB connection string and a long random `JWT_SECRET`.
4. Start the API with `npm run dev` (or `npm start`). It listens on port 3001 by default.
5. In `wellnest-frontend/.env`, set `VITE_API_URL=http://localhost:3001/api`, then start the frontend with `npm run dev` from `wellnest-frontend`.

Check `http://localhost:3001/api/health` for API status. The `storage` field reports `mongodb` when MongoDB connected, or `memory` when it did not. Memory storage is temporary and is cleared when the server restarts. Configure a reachable MongoDB cluster before relying on stored records.

## API routes

- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET|POST /api/medications`, `PATCH|DELETE /api/medications/:id`, `GET /api/medications/:id/history`
- `GET|POST /api/appointments`, `PATCH|DELETE /api/appointments/:id`
- `GET|POST /api/readings`, `PATCH|DELETE /api/readings/:id`

All account data routes require `Authorization: Bearer <token>`. Each record is scoped to the authenticated account.

This educational project is for personal organization only; it is not a clinical record system or a substitute for medical advice.

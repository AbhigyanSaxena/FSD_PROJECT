# Wellnest — Personal Health Tracker

Wellnest is a full-stack student project for organizing medications, appointments, and personal health readings.

## Project folders

- [`wellnest-frontend/`](wellnest-frontend/) — React and Vite web interface.
- [`wellnest-backend/`](wellnest-backend/) — Express API with MongoDB persistence.
- [`Wellnest_System_Design.docx`](Wellnest_System_Design.docx) — system design document.

## Run locally

Use two terminals:

1. In `wellnest-backend`, run `npm install`, copy `.env.example` to `.env`, configure `MONGODB_URI` and `JWT_SECRET`, then run `npm run dev`.
2. In `wellnest-frontend`, run `npm install`, copy `.env.example` to `.env`, set `VITE_API_URL=http://localhost:3001/api`, then run `npm run dev`.
3. Open the local URL printed by Vite. Check the backend at `http://localhost:3001/api/health`.

If MongoDB cannot connect, the API reports `"storage":"memory"` and uses temporary in-process storage that is cleared when the backend restarts. Set a valid MongoDB URI for persistent records. Never commit `.env` files or database credentials.

## Notes

This is an educational personal tracker, not a clinical record system or medical advice service.

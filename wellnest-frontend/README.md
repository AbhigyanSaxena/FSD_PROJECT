# Wellnest Frontend

Wellnest is a responsive personal health tracker interface for medications, appointments, and health readings. The frontend includes a light and dark theme, demo data for signed-out use, and account forms that connect to the Wellnest API.

## Requirements

- Node.js 18 or newer
- The Wellnest API for account sign-in and saved records

## Run locally

1. Run npm install.
2. Copy .env.example to .env.
3. Run npm run dev.
4. Open the local URL printed by Vite.

The frontend uses http://localhost:3001/api by default. Set VITE_API_URL in .env if the API uses another address.

Signed-out demo data is temporary browser state. Sign-in, registration, and account-backed records require the backend API.

## Build

Run npm run build to create a production build. Run npm run preview to view that build locally.

## Source layout

- src/App.jsx — dashboard, navigation, account dialog, and API calls
- src/styles.css — responsive styling and theme definitions
- src/main.jsx — React entry point
- index.html — Vite HTML shell

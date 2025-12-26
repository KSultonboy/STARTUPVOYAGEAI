# VoyageAI Project Overview

This document summarizes the current structure, behavior, and implemented features for the VoyageAI repo.

## Current Behavior
- Mobile app (Expo/React Native) with onboarding, auth, trip setup, trip generation, and tab navigation (plan/saved/offers/map/profile).
- Admin panel inside the mobile app for analytics and data management (places, offers, users, locations).
- Backend (Express) provides auth (JWT + refresh), trip planning, locations, and admin routes.
- Analytics events are tracked for register/login/plan generation and surfaced in admin overview/analytics.
- Data persists in a JSON store so runtime data survives server restarts; seed data is merged on first run.
- Profile includes avatar upload (base64) during sign up and can be updated later from the profile tab.

## File Structure (Key Parts)
```
voyage-ai/
  mobile/
    app/
      (tabs)/
        _layout.tsx
        map.tsx
        offers.tsx
        plan.tsx
        profile.tsx
        saved.tsx
      admin/
        _layout.tsx
        index.tsx
        analytics.tsx
        locations.tsx
        places.tsx
        offers.tsx
        users.tsx
      place/
        [id].tsx
      _layout.tsx
      +not-found.tsx
      generating.tsx
      index.tsx
      login.tsx
      onboarding.tsx
      preferences.tsx
      register.tsx
      trip-saved.tsx
      trip-setup.tsx
    components/
      admin/
        AdminScaffold.tsx
      voyage/
        PrimaryButton.tsx
        TripCard.tsx
        LoadingDots.tsx
    constants/
      voyageColors.ts
    context/
      AuthContext.tsx
      TripContext.tsx
    lib/
      api.ts
    .env
    app.json
    package.json

  server/
    server.js
    .env
    data/
      store.json (runtime data)
    src/
      config.js
      analytics/
        metrics.js
      auth/
        middleware.js
        permissions.js
        seed.js
        store.js
        tokens.js
      data/
        places.js (seed)
        offers.js (seed)
      planner/
        plan.js
      routes/
        admin.js
        auth.js
        locations.js
        offers.js
        places.js
        plan.js
      storage/
        dataStore.js
      utils/
        asyncHandler.js
        errors.js
      validators/
        admin.js
        auth.js
        plan.js

  deployment
  PROJECT_OVERVIEW.md
```

## Implemented Features (Current)
- Mobile UI/UX: refreshed layout, consistent design system, and improved profile/offers/saved/map pages.
- Animations: onboarding slide animations and generating page micro-interactions.
- Auth: register/login, JWT access + refresh, bcrypt hashing, roles/permissions, validation, and error handling.
- Trip planning: 3-tier budget logic with interest-based itinerary scoring.
- Admin panel:
  - Overview + analytics charts based on tracked events.
  - CRUD for places and offers, user role updates.
  - Locations management (countries and cities) with dynamic filters.
- Locations:
  - Admin routes for countries/cities.
  - Public locations endpoints used by trip setup.
  - Fallback: infer cities from places if no locations exist.
- Server hardening: CORS, helmet, compression, rate limits, request IDs, graceful shutdown.

## Deployment
- Deployment commands are documented in `deployment`.
```
ssh root@64.23.244.120
cd ~/apps/STARTUPVOYAGEAI
./deploy.sh
```
- This repo includes the deployment instructions, but deployment status is not verified here. Re-run the script above to deploy updated backend changes.

## Environment Configuration
Mobile (`mobile/.env`)
- `EXPO_PUBLIC_API_URL` -> backend base URL (example: `http://<LAN-IP>:5000` or production domain)

Server (`server/.env`)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
- `CORS_ORIGIN`, `NODE_ENV`, `PORT`
- `DATA_PATH`, `EVENT_RETENTION_DAYS`, `BODY_LIMIT`
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`
- `LOG_FORMAT`

## Notes
- Admin user is seeded at server startup using the `.env` values.
- Seed data for places/offers lives in `server/src/data/*` and is merged into the JSON store if missing.
- `server/data/store.json` is the live data store; treat it as runtime state.

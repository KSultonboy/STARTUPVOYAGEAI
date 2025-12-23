# VoyageAI Project Overview

This document explains the current structure, behavior, and completed features for the VoyageAI repo.

## What the Project Does (Current Behavior)
- Mobile app (Expo/React Native) with onboarding, auth, trip setup, trip generation, and tabs (plan/saved/offers/map/profile).
- Trip plan generation is rule-based on the backend with budget tiers and interest scoring.
- Admin panel inside the mobile app for analytics and managing places/offers/users (admin role only).
- Backend (Express) provides auth, admin, places, offers, and trip plan APIs with JWT + refresh tokens.
- Persistent storage uses a JSON file store so data survives server restarts.

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
```

## Completed Features
- Mobile UI/UX:
  - Modernized design system (colors/typography/spacing) and layout updates.
  - Onboarding flow with improved visuals and safer layout handling.
- Animations:
  - Onboarding transitions, page enter animations, and card/loader micro-interactions.
- Auth (Backend + Mobile):
  - Register/Login with JWT access + refresh tokens.
  - Password hashing with bcrypt.
  - Roles/permissions and guarded admin routes.
  - Validation and structured error handling.
- Admin Panel (Mobile):
  - Dashboard overview, analytics, places/offers CRUD, user role management.
  - Burger menu navigation and admin-only access control.
- Trip Planning:
  - 3-tier budget logic (simple/comfort/luxury).
  - Interest-based scoring and itinerary generation.
- Analytics:
  - Event tracking for register/login/plan generation with 14-day series.
- Production Hardening (Server):
  - CORS policy, helmet, compression, rate limits.
  - Request IDs, logging, graceful shutdown, config validation.
  - File-based data persistence to survive restarts.

## Environment Configuration
Mobile (`mobile/.env`)
- `EXPO_PUBLIC_API_URL` -> backend base URL (e.g. `http://<LAN-IP>:5000`)

Server (`server/.env`)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
- `CORS_ORIGIN`, `NODE_ENV`, `PORT`
- `DATA_PATH`, `EVENT_RETENTION_DAYS`, `BODY_LIMIT`
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`
- `LOG_FORMAT`

## Notes
- Admin user is seeded at server startup using the `.env` values.
- Current storage is JSON-file based; suitable for small-to-medium usage. For large scale, migrate to a real database.

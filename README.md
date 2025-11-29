# EVE Tool
## Overview

EVE Tool is split into two workspaces:

- backend — Node.js/TypeScript API, ESI integration, SDE importer, Prisma (PostgreSQL), Redis cache.
- frontend — React app built with Vite, TanStack Router/Query, Tailwind and shadcn/ui.

The backend exposes an Express server and a CLI for downloading, importing, and calculating additional data from the CCP Static Data Export (SDE). The frontend consumes the backend API to provide EVE‑focused UI views.

---

## Tech stack

Backend
- Language: TypeScript (ES modules)
- Runtime: Node.js
- Web: Express
- Data: PostgreSQL (via Prisma)
- Cache/backoff coordination: Redis (ioredis)
- Testing: Vitest + Supertest
- Linting/Type checking: ESLint, TypeScript

Frontend
- Language: TypeScript
- Framework/tooling: React, Vite
- Routing/Data‑fetching: TanStack Router + TanStack Query
- UI: Tailwind CSS, shadcn/ui, Radix UI

Package manager
- NPM is used in this repo 

---

## Requirements

- Node.js (recommended: 20+).
- NPM (comes with Node.js) — or your preferred alternative.
- PostgreSQL database
- Redis server
- EVE SSO application credentials for ESI (client id/secret + redirect URI)

---

## Setup

Clone the repo and install dependencies for both workspaces.

Backend
1. Copy environment file and adjust values:
   ```bash
   cd backend
   cp .env.example .env
   # edit .env with your settings
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Push Prisma schema to your database (creates tables):
   ```bash
   npm run db:push
   ```
4. (Optional but recommended) Preload SDE data:
   ```bash
   # Quick path: download, import core datasets, run calculations
   npm run sde:install
   # or run steps individually
   npm run sde:download
   npm run sde:import
   npm run sde:calculate
   ```

Frontend
1. Install packages:
   ```bash
   cd ../frontend
   npm install
   ```

---

## Running

Development
- Start backend (loads `.env`, watches TS):
  ```bash
  cd backend
  npm run dev
  # Server: http://localhost:3000 (configurable via PORT)
  ```
- Start frontend dev server:
  ```bash
  cd frontend
  npm run dev
  # Vite dev server: http://localhost:3005
  ```

Production (local)
```bash
cd backend
npm run build
npm start

cd ../frontend
npm run build
# TODO: add production serve command or hosting instructions for built frontend (e.g. static hosting)
```

---

## Scripts

Backend (`backend/package.json`)
- `dev` — Run Express server with tsx in watch mode loading `.env`.
- `start` — Run compiled server: `node --env-file .env dist/server.js`.
- `build` — TypeScript compile to `dist/`.
- `type-check` — TypeScript type checks (app + tests config).
- `lint` / `lint:fix` — Run ESLint (fix in place).
- `test` — Run Vitest in CI mode.
- `test:watch` — Run Vitest in watch/UI mode.
- `db:push` — Apply Prisma schema to database.
- `sde:cli` — Invoke SDE CLI directly: `sde/installer.ts`.
- `sde:install` — Download, import, and calculate SDE data (full pipeline).
- `sde:import` — Import one or more SDE datasets.
- `sde:calculate` — Run post‑import calculations.
- `sde:update` — Update DB to the latest SDE (download/import/calc if needed).
- `sde:download` — Download the latest SDE archive only.

SDE CLI usage (from `backend/sde/installer.ts`)
- Commands: `install`, `import`, `calculate`, `update`, `download`, `help`
- Global options: `--dry-run`, `--force`, `--datasets=<csv>`
- Notes:
  - `calculate` optionally accepts a subcommand for a specific calculation.
  - Use `npm run sde:cli -- --help` for the latest usage and the list of dataset/calculation IDs.

Frontend (`frontend/package.json`)
- `dev` — Start Vite dev server on port 3005.
- `build` — Build production bundle.

---

## Environment variables

Backend (`backend/.env`)
- Server/runtime
  - `PORT` — API port (default 3000)
  - `NODE_ENV` — `development` | `production`
- ESI API
  - `ESI_BASE_URL` — base URL, default `https://esi.evetech.net`
  - `ESI_COMPATIBILITY_DATE` — default `2025-11-06`
  - `ESI_ACCEPT_LANGUAGE` — IETF language tag, default `en`
  - `ESI_FALLBACK_TTL_SECONDS` — default `86400`
- ESI SSO (required for OAuth flows)
  - `ESI_SSO_CLIENT_ID` — REQUIRED
  - `ESI_SSO_CLIENT_SECRET` — REQUIRED
  - `ESI_SSO_REDIRECT_URI` — REQUIRED (must match EVE SSO app config)
  - `ESI_SSO_SCOPES` — space/comma‑separated list (e.g. `publicData`)
- ESI backoff & coordination
  - `ESI_BACKOFF_SHARE_REDIS` — default `true`
  - `ESI_BACKOFF_SOFT_REMAIN` — default `5`
  - `ESI_BACKOFF_HARD_REMAIN` — default `1`
  - `ESI_BACKOFF_KEY` — default `esi:cooldown-until`
  - `ESI_BACKOFF_JITTER` — default `150`
  - `ESI_BACKOFF_SKEW` — default `250`
- Redis
  - `REDIS_HOST` — default `localhost`
  - `REDIS_PORT` — default `6379`
  - `REDIS_PASSWORD` — optional
  - `CACHE_VERSION` — cache key version, default `v1`
- Database (Prisma)
  - `DATABASE_URL` — REQUIRED, e.g. `postgres://user:pass@host:5432/db?schema=public`

Frontend
- TODO: Document any required environment variables once introduced.

---

## Tests

Backend
- Run once:
  ```bash
  cd backend
  npm test
  ```
- Watch/UI mode:
  ```bash
  npm run test:watch
  ```

Frontend
- TODO: Add and document frontend tests.

---

## API routes

TODO: Document public API endpoints with request/response examples.

---

## Deployment

TODO: Add Dockerfile/compose and deployment guidelines (env variables, database migrations, SDE bootstrap on first run, static hosting for frontend, reverse proxy).

---

## License

MIT © Astreon

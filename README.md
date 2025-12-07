# Small Business Sales Assistant

Minimal frontend for the Go backend used in this repo. Lovable was only used to generate the initial skeleton — this repo is maintained locally.

## Quick start (dev)

1. Install dependencies

   ```bash
   npm install
   ```

2. Start backend (in this case: the Go server)

3. Start frontend

   ```bash
   npm run dev
   ```

   Frontend default: <http://localhost:5002>

## Environment

- Dev: keep `.env` empty so Vite's dev proxy forwards `/api` → `http://localhost:8080`.
- Prod: set `VITE_API_URL` to your API origin (no trailing `/api`), e.g.:

  ```bash
  VITE_API_URL=http://api.example.com
  ```
  
  Restart Vite after editing env files.

## Vite proxy & CORS

- `vite.config.ts` proxies `/api` (dev) to your backend (default target: `http://localhost:8080`). This avoids CORS during development.
- Production: the backend must provide proper CORS headers if frontend and backend are on different origins.

## What technologies are used for this project?

This project is built with:

- Lovable
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

---
> **Note:** The canonical repository is [**on GitHub**](https://github.com/vr33ni-dev/annalanah-sales-assistant-react) · [Mirror on GitLab →](https://gitlab.com/vr33ni-work/annalanah-sales-assistant-react) [![Mirror Status](https://github.com/vr33ni-dev/annalanah-sales-assistant-react/actions/workflows/gitlab-mirror.yml/badge.svg)](https://github.com/vr33ni-dev/annalanah-sales-assistant-react/actions/workflows/gitlab-mirror.yml)

# Gemini / Antigravity AI Agent Guidelines

## Identity & Role
- You are **Gemini / Antigravity**, an advanced AI coding assistant pair-programming on this full-stack web application.
- Prioritize clear, concise GitHub-style Markdown communication with clickable file links.
- Maintain documentation integrity and verify changes against existing frontend/backend patterns.

## Code Style & Frontend
- Frontend is TypeScript + React function components with hooks; follow existing Tailwind patterns in `src/app/admin/*` and `src/app/recommendation/*`.
- Use shared API helpers from `src/lib/apiClient.ts` (`apiGet/apiPost/apiPut/apiDelete/apiUploadFile`) instead of ad-hoc `fetch`.
- Admin list pages use DataTables with explicit init/destroy in `useEffect` and delegated row action handlers (see `src/app/admin/attractions/page.tsx`, `src/app/admin/users/page.tsx`).
- Edit pages use `useParams` + `navigate('/admin/<resource>', { replace: true })` after save/cancel.
- **Map & Location Preview:** In `PlaceDetailModal.tsx` and map previews, use Google Maps HTML iFrame Embed (`output=embed`) locked with both `className="pointer-events-none"` and an `<div className="absolute inset-0 z-10 bg-transparent" />` overlay layer to display instant, unclickable map previews without consuming paid Google Maps JS API quota. Never use Click-to-Load or paid interactive JS maps for preview boxes.

## Architecture & Backend
- Runtime truth: Vite + React Router frontend (`src/main.tsx`) and FastAPI backend (`backend/app/main.py`).
- Routes: `/` and `/recommend` render recommendation flow; admin lives under `/admin/*` with client-side guard in `src/main.tsx` + `src/lib/auth.ts`.
- Backend routers are in `backend/app/routers/*.py`; DB access is MySQL via `get_connection()` in `backend/app/core/database.py`.
- **OpenAPI Docs Maintenance:** OpenAPI Swagger documentation is available at `http://localhost:8000/docs#/`. Whenever backend endpoints are added or modified, always create or update Pydantic models in `backend/app/schemas/schemas.py` and attach them via `response_model` so that API documentation remains fully typed and up-to-date.

## Recommendation System (`backend/app/routers/recommendation.py`)
- **Existing Users (เคยให้คะแนน):** Receive 100% Collaborative Filtering (CF) scoring loaded from Pickle (`.pkl`) models across categories (`work`, `finance`, `love`).
- **New Users (ยังไม่เคยให้คะแนน):** Receive 100% Popularity scoring calculated from overall MySQL database ratings.

## Build and Test
- Frontend dev server: `npm run dev`
- Frontend build check: `npm run build`
- Backend run: `cd backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`
- Smoke check backend: `GET /health` or visit `http://localhost:8000/docs#/`
- Quick syntax check: `cd backend && ..\.venv\Scripts\python.exe -m py_compile app\main.py app\schemas\schemas.py app\routers\recommendation.py app\routers\activity_log.py`

## Project Conventions & Security
- API prefixes follow established router paths: `/api/attraction`, `/api/image`, `/api/rating`, `/api/users`, `/api/activity-logs`, `/api/category`, `/api/district`, `/api/type`, `/api/sect`.
- Image URLs may be relative (`/uploads/...`); resolve against backend base URL (`http://localhost:8000`) before previewing.
- Keep SQL queries parameterized to prevent SQL injection.
- Do not re-introduce unneeded interactive Google Maps JS API calls that consume quota.

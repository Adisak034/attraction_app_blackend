# Project Guidelines

## Code Style
- Frontend is TypeScript + React function components with hooks; follow existing Tailwind patterns in `src/app/admin/*` and `src/app/recommendation/*`.
- Use shared API helpers from `src/lib/apiClient.ts` (`apiGet/apiPost/apiPut/apiDelete/apiUploadFile`) instead of ad-hoc `fetch`.
- Admin list pages use DataTables with explicit init/destroy in `useEffect` and delegated row action handlers (see `src/app/admin/attractions/page.tsx`, `src/app/admin/users/page.tsx`).
- Edit pages use `useParams` + `navigate('/admin/<resource>', { replace: true })` after save/cancel.

## Architecture
- Runtime truth: Vite + React Router frontend (`src/main.tsx`) and FastAPI backend (`backend/app/main.py`), not Next.js runtime.
- Routes: `/` and `/recommend` render recommendation flow; admin lives under `/admin/*` with client-side guard in `src/main.tsx` + `src/lib/auth.ts`.
- Backend routers are in `backend/app/routers/*.py`; DB access is MySQL via `get_connection()` in `backend/app/core/database.py`.
- Recommendation system is server-driven in `backend/app/routers/recommendation.py` with model status/reload/upload APIs.

## Build and Test
- Frontend install: `npm install`
- Frontend dev: `npm run dev`
- Frontend build check: `npm run build`
- Backend env (Windows example): `python -m venv .venv && .\.venv\Scripts\activate && pip install -r backend\requirements.txt`
- Backend run: `cd backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`
- Smoke check backend: `GET /health`
- Quick backend syntax check: `cd backend && ..\.venv\Scripts\python.exe -m py_compile app\routers\users.py app\routers\attractions.py app\routers\images.py app\routers\ratings.py app\routers\activity_log.py app\routers\recommendation.py`

## Project Conventions
- API prefixes are intentionally mixed; use existing router paths exactly: `/api/attraction`, `/api/image`, `/api/rating`, `/api/users`, `/api/activity-logs`, `/api/category`, `/api/district`, `/api/type`, `/api/sect`.
- Recommendation read endpoint supports both `/recommend/{user_id}` and `/api/recommend/{user_id}`; model admin uses `/api/recommend/models/*`.
- Image URLs may be relative (`/uploads/...`); resolve against backend base URL before previewing.
- Keep uploads tracked with `.gitkeep` in `public/uploads/` and `backend/public/uploads/`.

## Integration Points
- Alias `@` maps to `src` (`vite.config.ts`, `tsconfig.json`).
- API base is hardcoded to `http://localhost:8000` in `src/lib/apiClient.ts`.
- Frontend env keys in active use: `VITE_API_URL` (some pages) and `VITE_GOOGLE_MAPS_API_KEY` (map component).
- Backend CORS allows localhost variants for Vite ports and serves uploaded files via `/uploads`.
- DB schema reference is `appdb.sql`; verify table naming consistency with routers before large migrations.

## Security
- Current auth/role guard is frontend-only (`localStorage` session in `src/lib/auth.ts`); backend endpoints are not protected by auth middleware.
- Password handling is currently plaintext in app flow (`backend/app/routers/users.py`, login checks in frontend). Do not introduce new plaintext auth logic.
- Recommendation/image model upload endpoints are unauthenticated; treat as sensitive in production hardening.
- Keep SQL parameterized and avoid string interpolation in queries.

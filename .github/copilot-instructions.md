# Project Guidelines

## Code Style
- Frontend uses TypeScript + React function components with typed interfaces and hooks (`useState/useEffect/useRef`).
- Use API helpers from `src/lib/apiClient.ts` (`apiGet/apiPost/apiPut/apiDelete/apiUploadFile`) instead of raw `fetch`.
- Use Tailwind utility classes; follow card/table/modal patterns in `src/app/admin/attractions/page.tsx` and `src/app/admin/images/page.tsx`.
- Data pages use `datatables.net-dt` with explicit init/destroy in `useEffect`.

## Architecture
- Frontend is Vite + React Router (not Next runtime); route wiring is in `src/main.tsx`.
- Backend is FastAPI in `backend/app/main.py` with routers in `backend/app/routers/*.py`.
- Database access is MySQL via `get_connection()` from `backend/app/core/database.py`.
- Upload flow is `POST /api/image/upload` in `backend/app/routers/images.py`, served via `/uploads` mount in `backend/app/main.py`.

## Build and Test
- Install frontend deps: `npm install`
- Run frontend dev: `npm run dev`
- Build frontend: `npm run build`
- Backend setup (Windows): `cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt`
- Run backend dev: `cd backend && python -m uvicorn app.main:app --reload --port 8000`
- Quick backend syntax check: `cd backend && python -m py_compile app/routers/ratings.py app/routers/activity_log.py app/routers/users.py app/routers/attractions.py app/routers/images.py`

## Project Conventions
- CRUD list pages follow: fetch-on-mount, DataTable init/destroy, modal add form, delegated row action handlers.
- Edit pages read params from `react-router-dom` and return using `navigate('/admin/<resource>', { replace: true })`.
- Image URLs may be relative (`/uploads/...`); resolve against backend base URL before rendering preview.
- API paths are mixed singular/plural; follow actual router prefixes: `/api/attraction`, `/api/image`, `/api/rating`, `/api/users`, `/api/activity-logs`, `/api/category`, `/api/district`, `/api/type`, `/api/sect`.

## Integration Points
- Alias `@` maps to `src` (`vite.config.ts`, `tsconfig.json`).
- Frontend default backend URL is `http://localhost:8000` in `src/lib/apiClient.ts`.
- DB schema source of truth is `appdb.sql`.
- Keep upload folders tracked with `.gitkeep`: `public/uploads/`, `backend/public/uploads/`.
- README has legacy Next.js references; treat `src/main.tsx` + `package.json` as runtime truth.

## Security
- Passwords are currently plaintext in `backend/app/routers/users.py`; do not add new plaintext auth logic.
- No auth middleware is currently enforced in `backend/app/main.py`; treat endpoints as publicly reachable in dev.
- Keep SQL parameterized and avoid string interpolation in queries.

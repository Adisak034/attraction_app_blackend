# Temple Admin & Recommendation - React (Vite SPA) + FastAPI Backend

This document explains the split architecture and design patterns of the **Temple Attractions & Recommendation System**, migrated to a modern, highly decoupled full-stack architecture:
- **Frontend**: Single Page Application (SPA) built with **React, Vite, TypeScript, and React Router** (located at `/src`).
- **Backend**: High-performance RESTful API built with **FastAPI, Python, MySQL, and Machine Learning `.pkl` Models** (located at `/backend`).

---

## 🏛️ System Architecture Overview

```
Frontend (Vite + React Router SPA)             Backend (FastAPI + MySQL)
+------------------------------------+         +----------------------------------+
|  src/app/recommendation/ (Web App) | <=====> | /recommend (CF / Popularity ML)  |
|  src/app/admin/* (Control Panel)   | <=====> | /api/* (CRUD + Activity Logs)    |
+------------------------------------+         +----------------------------------+
                 ^                                               ^
                 | Axios (src/lib/apiClient.ts)                  | PyMySQL Pool
                 v                                               v
+------------------------------------+         +----------------------------------+
|  VITE_API_URL Configuration        |         | MySQL Database (`appdb.sql`)     |
+------------------------------------+         +----------------------------------+
```

---

## 📁 Key Directories & Modules

| Path | Purpose |
|------|---------|
| `/src/app/recommendation/` | User Recommendation Web App SPA (Landing view, rating flows, interactive maps, dynamic aesthetics). |
| `/src/app/admin/` | Admin control panel featuring DataTables for `attractions`, `users`, `images`, `ratings`, `category`, `activity-logs`, and `recommendation-models`. |
| `/src/lib/apiClient.ts` | Centralized HTTP communication layer featuring `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiUploadFile`, and automatic image URL resolution (`resolveImageUrl`). |
| `/src/lib/auth.ts` | Session state utilities (`isAuthenticated`, `isAdmin`, `getCurrentUser`) powered by `localStorage` persistence. |
| `/src/lib/swal.ts` | Unified SweetAlert2 dialog helper (`executeAlert`) for standardized user notifications and confirmation popups. |
| `/backend/app/main.py` | FastAPI application factory, middleware configuration, and CORS setup. |
| `/backend/app/core/database.py` | Thread-safe PyMySQL database connection pool (`get_connection()`). |
| `/backend/app/routers/*.py` | Modular API routers implementing Single Responsibility Principle (`recommendation.py`, `activity_log.py`, etc.). |
| `/backend/app/schemas/schemas.py` | Pydantic data validation and OpenAPI response type definitions. |
| `/models/*.pkl` | Pickle machine learning models (`item_similarity_work.pkl`, `finance.pkl`, `love.pkl`) for Collaborative Filtering. |

---

## 🔄 Frontend-to-Backend Communication Pattern

All frontend components communicate with the FastAPI backend through standardized helper functions defined in `src/lib/apiClient.ts`. Never use ad-hoc `fetch()` calls directly inside UI components.

### Example: Standard API Requests
```typescript
import { apiGet, apiPost, apiPut, apiDelete, resolveImageUrl } from '@/lib/apiClient';

// Fetching attractions list
const attractions = await apiGet<Attraction[]>('/api/attraction');

// Creating a new user
const newUser = await apiPost<User>('/api/users', userData);

// Updating an existing category
await apiPut(`/api/category/${categoryId}`, updatedData);

// Deleting a rating
await apiDelete(`/api/rating/${ratingId}`);
```

### Example: File Uploads & Image URL Resolution
```typescript
import { apiUploadFile, resolveImageUrl } from '@/lib/apiClient';

// Uploading an image via multipart/form-data
const uploadResult = await apiUploadFile('/api/image/upload', file);

// Resolving backend relative paths to full absolute URLs for preview
const previewUrl = resolveImageUrl(attraction.image);
```

---

## 🔐 Authentication & Route Protection

Frontend routing is managed by `React Router` in `src/main.tsx`. Client-side route protection for the Admin Panel is enforced via the `ProtectedAdminRoute` wrapper:

```tsx
// src/main.tsx
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isAuthenticated() || !isAdmin()) {
    return <Navigate to="/recommend" replace />;
  }
  return <>{children}</>;
};
```

*Note: For production deployments, API endpoints in `backend/app/routers/` should also enforce JWT or OAuth2 bearer token verification middleware.*

---

## 🌐 CORS Configuration (`backend/app/main.py`)

The FastAPI backend explicitly permits requests from configured local development environments and origins listed in `backend/.env` (`CORS_ORIGINS`):
- `http://localhost:5173` (Vite SPA default port)
- `http://localhost:3000` (Alternative React dev port)
- `http://127.0.0.1:5173` / `http://127.0.0.1:3000`

---

## 🛠️ Build & Verification Commands

### Frontend Production Verification
```bash
# Compile TypeScript & bundle assets with Vite
npm run build

# Preview compiled production SPA locally
npm run preview
```

### Backend Production Execution
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## ❓ Troubleshooting Guide

### 1. Frontend cannot connect to Backend API
- Ensure FastAPI is running (`http://localhost:8000/health`).
- Verify that `VITE_API_URL` is set correctly in `src/.env` or `.env.local`:
  ```env
  VITE_API_URL=http://localhost:8000
  ```
- Check browser DevTools console for CORS violations; verify `backend/app/main.py` CORS setup.

### 2. Database Connection Errors
- Verify MySQL service is active on `port 3306`.
- Inspect connection parameters inside `backend/.env`.
- Ensure schema is imported: `mysql -u root -p appdb -e "SHOW TABLES;"`.

### 3. Recommendation Engine `.pkl` Model Errors
- If recommendation models show `loaded: no` in `/admin/recommendation-models`, verify that the `.pkl` files exist inside the `/models` directory.
- Click the **Reload Models** button in the dashboard or send `POST /models/reload` to hot-reload them into memory.

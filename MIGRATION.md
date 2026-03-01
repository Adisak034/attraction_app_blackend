# Temple Admin - Next.js Frontend + FastAPI Backend

This project has been migrated from a monolithic Next.js application to a split architecture with:
- **Frontend**: React (via Next.js at `/src`)
- **Backend**: FastAPI (at `/backend`)

## Project Structure

```
temple_blackend/
├── src/                    # Next.js Frontend (React Admin UI)
│   ├── app/
│   │   ├── admin/         # Admin pages (attractions, users, images, ratings, categories)
│   │   └── layout.tsx
│   └── lib/
│       └── api.ts         # API communication helpers
├── backend/               # FastAPI Backend
│   ├── app/
│   │   ├── main.py        # FastAPI app entry point
│   │   ├── core/
│   │   │   └── database.py # MySQL connection pool
│   │   ├── routers/       # API route handlers
│   │   └── schemas/       # Pydantic models
│   ├── requirements.txt
│   └── .env.example
├── appdb.sql              # MySQL database schema
├── package.json           # Frontend dependencies
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+ (for React frontend)
- Python 3.9+ (for FastAPI backend)
- MySQL Server running on port 3306

### 1. Database Setup

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE appdb;"

# Import schema
mysql -u root -p appdb < appdb.sql
```

### 2. Backend Setup (FastAPI)

```bash
# Navigate to backend
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
copy .env.example .env
# (Edit .env with your MySQL credentials if different)

# Run FastAPI development server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

FastAPI will be available at: **http://localhost:8000**
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### 3. Frontend Setup (React + Vite)

```bash
# From project root

# Install dependencies
npm install

# Create .env.local (optional, for API URL configuration)
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

React Frontend will be available at: **http://localhost:3000** (or next available port)
- Admin Panel: http://localhost:3000/admin
- Dashboard: http://localhost:3000/admin/attractions

## API Endpoints

### Base URL
- **Backend API**: `http://localhost:8000`

### Main Endpoints
- **Attractions**: `GET/POST /api/attraction`, `GET/PUT/DELETE /api/attraction/{id}`
- **Users**: `GET/POST /api/users`, `GET/PUT/DELETE /api/users/{id}`
- **Images**: `GET/POST /api/image`, `GET/PUT/DELETE /api/image/{id}`, `POST /api/image/upload`
- **Ratings**: `GET/POST /api/rating`, `DELETE /api/rating/{id}`
- **Lookup Tables**: `GET /api/category`, `GET /api/district`, `GET /api/type`, `GET /api/sect`

## Key Files

| File | Purpose |
|------|---------|
| `/backend/app/main.py` | FastAPI app with CORS configuration |
| `/backend/app/core/database.py` | MySQL connection pool manager |
| `/backend/app/routers/*.py` | API route handlers |
| `/src/lib/api.ts` | Frontend API communication helpers |
| `/src/app/admin/` | React admin UI components |
| `/appdb.sql` | Database schema (source of truth) |

## Frontend to Backend Communication

All React components use the `/src/lib/api.ts` helpers:

```typescript
import { API_ENDPOINTS, apiGet, apiPost, apiDelete, apiPut } from '@/lib/api';

// Examples
const attractions = await apiGet(API_ENDPOINTS.ATTRACTIONS);
const newAttraction = await apiPost(API_ENDPOINTS.ATTRACTIONS, data);
await apiDelete(API_ENDPOINTS.ATTRACTION(id));
```

## CORS Configuration

FastAPI is configured to accept requests from:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost`

Modify `/backend/app/main.py` if you need different origins.

## Build for Production

### Frontend (React)
```bash
npm run build
npm start
```

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Notes

- **Database**: Same MySQL schema (`appdb.sql`)
- **Authentication**: Not implemented (add middleware for protected routes in production)
- **Passwords**: Currently stored in plaintext (use bcrypt in production)
- **File Uploads**: Images saved to `public/uploads/` (served at `/uploads/`)

## Troubleshooting

### Frontend can't connect to Backend
- Ensure FastAPI is running on port 8000
- Check CORS settings in `/backend/app/main.py`
- Verify `NEXT_PUBLIC_API_URL` in frontend `.env.local`

### Database Connection Error
- Verify MySQL is running on port 3306
- Check credentials in `/backend/.env`
- Ensure database `appdb` exists: `mysql -u root -p appdb -e "SHOW TABLES;"`

### Port Already in Use
- Change FastAPI port: `python -m uvicorn app.main:app --port 9000`
- Change React port: `npm run dev -- -p 3001`

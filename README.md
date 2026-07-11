# Temple Attractions & Recommendation System

A modern full-stack web application featuring an AI-driven temple recommendation system and an intuitive admin management dashboard. Built with a responsive **React (Vite + React Router) SPA** frontend and a robust **FastAPI (Python + MySQL)** backend powered by machine learning collaborative filtering (`.pkl` models).

---

## 🌟 System Architecture & Core Features

The system consists of two major integrated applications:

### 1️⃣ User Recommendation Web App (`/` & `/recommend`)
- 🔮 **Hybrid AI Recommendation Engine**:
  - **Existing Users**: Receives personalized **Collaborative Filtering (CF)** scores loaded from pre-trained machine learning (`.pkl`) models across distinct categories (`work` / การงาน, `finance` / การเงิน, `love` / ความรัก).
  - **New Users**: Receives optimized **Popularity-Based** scoring calculated from overall visitor ratings.
- 🗺️ **Interactive & Safe Map Previews**: Displays location previews using Google Maps HTML iFrame Embeds (`output=embed`) locked with pointer-event overlays to provide instant, responsive maps without consuming interactive JS API quota.
- 🎨 **Premium Dynamic UI/UX**: Implements rich dark-mode aesthetics, custom mystical background themes, smooth micro-animations, and detailed place modals.
- 🔍 **Search & Advanced Filters**: Multi-criteria filtering by province/district (`district`), attraction type (`type`), and Buddhist sect (`sect`).
- 📜 **Navigation History & Ratings**: Track recently viewed temples and submit user ratings directly from the UI.

### 2️⃣ Admin Control Dashboard (`/admin/*`)
- 📊 **Comprehensive Management (CRUD)**:
  - 📍 **Attractions (`/admin/attractions`)**: Full DataTable management with category tags, descriptions, and coordinates.
  - 👥 **Users (`/admin/users`)**: Role-based access control (`admin` / `user`) with CSV export capabilities.
  - 🖼️ **Images (`/admin/images`)**: Multi-image file uploads with automatic URL resolution (`resolveImageUrl`).
  - ⭐ **Ratings (`/admin/ratings`)**: Monitor visitor feedback and ratings across attractions.
  - 📑 **Categories (`/admin/category`)**: Manage category mappings and display styles.
- 🛡️ **System Audit & Model Control**:
  - 📋 **Activity Logs (`/admin/activity-logs`)**: Complete audit trail tracking admin operations, timestamps, and resource modifications.
  - 🤖 **Recommendation Models (`/admin/recommendation-models`)**: Monitor active `.pkl` model status (`file: yes/no`, `loaded: yes/no`) and trigger instant model reloads directly from the dashboard.

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js** `18+` (for React + Vite frontend)
- **Python** `3.9+` (for FastAPI backend)
- **MySQL Server** running (`port 3306`)

### 1️⃣ Database Setup
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE appdb;"

# Import schema
mysql -u root -p appdb < appdb.sql
```

### 2️⃣ Backend Setup (FastAPI)
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows PowerShell / CMD
# source venv/bin/activate     # macOS / Linux

# Install dependencies & run
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
✅ **Backend API**: `http://localhost:8000` (Swagger Docs available at `http://localhost:8000/docs`)

### 3️⃣ Frontend Setup (React + Vite SPA)
```bash
# From project root
npm install
npm run dev
```
✅ **Recommendation Web App**: `http://localhost:5173/` (or port assigned by Vite)  
✅ **Admin Dashboard**: `http://localhost:5173/admin`

---

## 📂 Project Structure

```
temple_blackend/
├── src/                          # React Frontend (Vite + React Router SPA)
│   ├── app/
│   │   ├── recommendation/       # User Recommendation Web App
│   │   │   ├── components/       # Modular UI components (LandingView, RatingModal, etc.)
│   │   │   └── App.tsx           # FSM state coordinator
│   │   └── admin/                # Admin Dashboard UI pages
│   │       ├── attractions/      # Attractions management
│   │       ├── users/            # User role & profile management
│   │       ├── images/           # Image gallery & uploads
│   │       ├── ratings/          # Rating monitoring
│   │       ├── category/         # Category management
│   │       ├── activity-logs/    # System audit logs
│   │       └── recommendation-models/ # ML model status & reload
│   ├── components/               # Shared reusable components (Table, AlertDialog, ModalFrame)
│   ├── lib/                      # Core frontend libraries
│   │   ├── apiClient.ts          # Centralized Axios HTTP client & image resolver
│   │   ├── auth.ts               # Session management & status helpers (isAuthenticated, isAdmin)
│   │   └── swal.ts               # Programmatic dialog & alert utilities
│   └── main.tsx                  # Router configuration & ProtectedAdminRoute guard
├── backend/                      # FastAPI Python Backend
│   ├── app/
│   │   ├── main.py               # FastAPI entry point & CORS configuration
│   │   ├── core/
│   │   │   └── database.py       # MySQL connection pool manager
│   │   ├── routers/              # API route controllers (recommendation, activity_log, etc.)
│   │   └── schemas/              # Pydantic data validation schemas
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Backend environment template
├── models/                       # Pre-trained Collaborative Filtering (.pkl) models
├── public/                       # Static public assets (favicon, uploaded attraction images)
├── appdb.sql                     # Official MySQL database schema
├── MIGRATION.md                  # Architecture & Migration Guide
├── SETUP_GUIDE.md                # Comprehensive Step-by-Step Installation Guide
└── README.md                     # This documentation
```

---

## 🔗 API Endpoints Summary

Interactive OpenAPI Swagger documentation is available at **`http://localhost:8000/docs`**.

| Prefix | Supported HTTP Methods | Description |
|--------|------------------------|-------------|
| `/api/attraction` | `GET`, `POST`, `PUT`, `DELETE` | List, search, create, update, and delete temple attractions |
| `/api/users` | `GET`, `POST`, `PUT`, `DELETE` | Admin user account management and profile updates |
| `/api/image` | `GET`, `POST`, `PUT`, `DELETE` | Attraction image associations (`/upload` for multipart files) |
| `/api/rating` | `GET`, `POST`, `DELETE` | Submit new visitor ratings and monitor existing feedback |
| `/api/activity-logs` | `GET` | Retrieve structured audit logs of administrative actions |
| `/api/category` | `GET` | Lookup attraction categories (`work`, `finance`, `love`) |
| `/api/district` | `GET` | Lookup geographic districts and provinces |
| `/api/type` | `GET` | Lookup temple structural classification types |
| `/api/sect` | `GET` | Lookup Buddhist sects and denominations |
| `/recommend` | `POST` | Execute Collaborative Filtering / Popularity recommendation engine |
| `/models/status` | `GET` | Inspect `.pkl` machine learning model file availability |
| `/models/reload` | `POST` | Hot-reload `.pkl` recommendation models into active memory |

---

## ⚙️ Environment Configuration

### Frontend (`.env` or `.env.local`)
```env
VITE_API_URL=http://localhost:8000
```

### Backend (`backend/.env`)
```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=appdb
DB_PORT=3306
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🛠️ Production Build & Deployment

### Frontend Bundle
```bash
npm run build
npm run preview
```

### Backend Production Server
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 📚 Documentation & Guides
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**: Detailed step-by-step setup, database troubleshooting, and server port forwarding instructions.
- **[MIGRATION.md](./MIGRATION.md)**: Architectural design decisions, frontend-backend split details, and communication patterns.
- **[FastAPI Documentation](https://fastapi.tiangolo.com/)** | **[Vite Documentation](https://vitejs.dev/)** | **[Tailwind CSS](https://tailwindcss.com/)**

# Complete Setup & Installation Guide

Follow this comprehensive step-by-step guide to set up, run, and manage the **Temple Attractions & Recommendation System** (FastAPI backend + React Vite SPA frontend).

---

## Step 1: Verify System Prerequisites

### Node.js (Frontend Environment)
```bash
node --version  # Required: v18.0.0 or higher
npm --version   # Required: v8.0.0 or higher
```

### Python (Backend Environment)
```bash
python --version  # Required: Python 3.9+ (Python 3.11 or 3.13 recommended)
pip --version
```

### MySQL Database Server
```bash
mysql --version
# Ensure the MySQL service is running on your operating system (default port 3306)
```

---

## Step 2: Database Initialization (`appdb.sql`)

### Windows PowerShell / CMD
```powershell
# Connect to MySQL as root
mysql -u root -p

# In the MySQL interactive prompt:
CREATE DATABASE appdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Import the database schema and seed data
mysql -u root -p appdb < appdb.sql
```

### macOS / Linux
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS appdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p appdb < appdb.sql
```

### Verify Tables Imported Successfully
```bash
mysql -u root -p appdb -e "SHOW TABLES;"
```
You should see: `attraction`, `attraction_category`, `attraction_image`, `category`, `district`, `rating`, `sect`, `type`, and `user`.

---

## Step 3: Backend Setup (FastAPI + Machine Learning Models)

### Navigate to the Backend Directory
```bash
cd backend
```

### Create & Activate Python Virtual Environment

**Windows (PowerShell / CMD):**
```powershell
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Check Backend Environment Configuration (`backend/.env`)
Create or inspect your `backend/.env` file. If using default local MySQL settings:
```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=appdb
DB_PORT=3306
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```
*(If your MySQL server has a root password, set `DB_PASSWORD` accordingly).*

### Verify Collaborative Filtering Models (`/models/*.pkl`)
Ensure that your pre-trained machine learning models exist in the root `models/` directory:
- `models/item_similarity_work.pkl` (Work / การงาน recommendations)
- `models/finance.pkl` (Finance / การเงิน recommendations)
- `models/love.pkl` (Love / ความรัก recommendations)

### Start the FastAPI Development Server
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see terminal logs indicating the server is active:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

### Verify Backend Health & API Docs
- **Health Check**: `http://localhost:8000/health` (Returns `{"status": "ok", "message": "Backend is running"}`)
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

---

## Step 4: Frontend Setup (React + Vite SPA)

### Open a New Terminal & Navigate to Project Root
```bash
# Ensure you are in the main project root directory (temple_blackend)
pwd
```

### Install Node Dependencies
```bash
npm install
```

### Configure Frontend Environment (`.env` or `.env.local`)
Create or verify `src/.env` (or `.env.local` in project root) to point to your FastAPI server:
```env
VITE_API_URL=http://localhost:8000
```

### Start the Vite Development Server
```bash
npm run dev
```

You should see Vite output:
```
  VITE v5.4.21  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 5: Access & Explore the Application

### 🌟 1. User Recommendation Web App (`http://localhost:5173/`)
- **Landing & Category Selection**: Choose your spiritual blessing goal (`การงาน / Work`, `การเงิน / Finance`, `ความรัก / Love`).
- **Personalized Recommendations**: Existing users receive Collaborative Filtering AI scores (`CF`); new users receive popularity-ranked top attractions (`Popularity`).
- **Interactive Map Previews**: View exact attraction locations via instant, unclickable Google Maps embed frames locked with safety overlays (`pointer-events-none`).
- **Search & Filter**: Filter attractions dynamically by District (` district`), Temple Type (`type`), and Buddhist Sect (`sect`).
- **Place Detail Modal**: Read rich historical descriptions and submit visitor ratings (`1-5 stars`).

### 🛠️ 2. Admin Control Dashboard (`http://localhost:5173/admin`)
*(Log in with an administrator account to access management tools)*:
- **📍 Attractions (`/admin/attractions`)**: Create, update, or delete temple profiles with multi-select categories and latitude/longitude coordinates.
- **👥 Users (`/admin/users`)**: Manage administrator and regular user accounts (`admin` vs `user` roles) + export lists to `.csv`.
- **🖼️ Images (`/admin/images`)**: Upload new attraction photos to `public/uploads/` and link them to temple records.
- **⭐ Ratings (`/admin/ratings`)**: Monitor user ratings and delete inappropriate reviews.
- **📑 Categories (`/admin/category`)**: Manage system category tags.
- **📋 Activity Logs (`/admin/activity-logs`)**: Review chronological audit records of all administrative actions (`CREATE`, `UPDATE`, `DELETE`).
- **🤖 Recommendation Models (`/admin/recommendation-models`)**: Check status of active `.pkl` recommendation files (`file: yes/no`, `loaded: yes/no`) and hot-reload models instantly into backend memory.

---

## Step 6: Server Deployment & Port Forwarding

If deploying on a remote Linux server or cloud virtual machine:

### 1. Configure Frontend API URL for Public Access
Edit `src/.env` or `.env.local` with the server's public IP or domain:
```env
VITE_API_URL=http://your-server-ip:8000
```

### 2. Run Backend with Gunicorn / Uvicorn Workers
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 3. Build & Serve Frontend Production Bundle
```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```
Or serve the generated `dist/` directory using **Nginx** or **Apache**.

---

## Troubleshooting & FAQ

### Backend shows `ModuleNotFoundError` on Startup
Make sure you activated your Python virtual environment (`venv\Scripts\activate`) before running `pip install -r requirements.txt` and starting `uvicorn`.

### Images Not Displaying in Frontend (`404 Not Found`)
Ensure that uploaded image files exist inside `public/uploads/`. The frontend `resolveImageUrl` function automatically prefixes relative paths (`/uploads/filename.jpg`) with `VITE_API_URL`.

### Recommendation Models Show `loaded: no` in Admin Panel
Ensure the three `.pkl` files (`item_similarity_work.pkl`, `finance.pkl`, `love.pkl`) are placed inside the `/models/` directory in the project root. Then navigate to `/admin/recommendation-models` and click **Reload Models**.

### Database Permission or Connection Refused
Verify that MySQL is running on port 3306 and check that `DB_USER` and `DB_PASSWORD` inside `backend/.env` match your database credentials.

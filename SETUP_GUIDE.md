# Complete Setup Guide

Follow this guide step-by-step to set up the Temple Admin Dashboard with FastAPI backend and React frontend.

## Step 1: Verify Prerequisites

### Node.js
```bash
node --version  # Should be 18+
npm --version   # Should be 8+
```

### Python
```bash
python --version  # Should be 3.9+
pip --version
```

### MySQL
```bash
mysql --version
# Start MySQL service if not running (depends on your OS)
```

## Step 2: Database Initialization

### Windows PowerShell
```powershell
# Connect to MySQL
mysql -u root -p

# In MySQL command line:
CREATE DATABASE appdb;
EXIT;

# Import schema
mysql -u root -p appdb < appdb.sql
```

### macOS/Linux
```bash
mysql -u root -p -e "CREATE DATABASE appdb;"
mysql -u root -p appdb < appdb.sql
```

### Verify Database
```bash
mysql -u root -p appdb -e "SHOW TABLES;"
# Should show: attraction, attraction_category, attraction_image, user, rating, category, district, type, sect
```

## Step 3: Backend Setup

### Navigate to Backend Directory
```bash
cd backend
```

### Create Python Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Configure Environment
The `.env` file is already created with defaults:
```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=appdb
DB_PORT=3306
```

**If your MySQL credentials are different, edit `backend/.env`**

### Start Backend Server

**Important: Navigate to the backend directory first**

**Windows (PowerShell):**
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**macOS/Linux:**
```bash
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Will watch for changes in these directories
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [PID] using StatReload
```

### Test Backend
Open in browser: **http://localhost:8000/health**
Should return: `{"status":"ok","message":"Backend is running"}`

API Documentation: **http://localhost:8000/docs**

## Step 4: Frontend Setup

### Navigate to Project Root
```bash
cd ..  # Go back to project root
```

### Install Dependencies
```bash
npm install
```

### Configure Environment
The `.env.local` file is already created:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Start Frontend Server
```bash
npm run dev
```

You should see:
```
> temple_blackend@0.1.0 dev
> vite

VITE v5.4.21  ready in 360 ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: use --host to expose
```

**Note:** If ports 3000-3001 are in use, Vite will automatically use the next available port (3002, 3003, etc.)

## Step 5: Access the Application

### Admin Dashboard
Open in browser: **http://localhost:3001/admin**
(or **http://localhost:3002/admin** if port 3001 is in use)

Note: Check the terminal output when `npm run dev` starts to see which port is assigned.

### Sections Available
- **Attractions** - View, create, edit, delete temple attractions with images and categories
- **Users** - Manage admin users with roles
- **Images** - Upload and manage attraction images
- **Ratings** - View visitor ratings for attractions
- **Categories** - Browse attraction categories

## Troubleshooting

### Backend: "ModuleNotFoundError: No module named 'app'"
This happens if you run the uvicorn command from the project root instead of the backend directory.

**Solution:**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Port 3000/8000 Already in Use

**Find Process Using Port (Windows):**
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Find Process Using Port (macOS/Linux):**
```bash
lsof -i :8000
kill -9 <PID>
```

**Or Use Different Port:**
```bash
# Try port 3001 for frontend
npm run dev -- -p 3001

# Try port 9000 for backend
python -m uvicorn app.main:app --port 9000
# Then update NEXT_PUBLIC_API_URL in .env.local
```

### MySQL Connection Failed
```bash
# Check if MySQL is running
mysql -u root -p -e "SELECT 1;"

# If connection refused, verify:
# 1. MySQL service is running
# 2. Port 3306 is correct (change in backend/.env if needed)
# 3. Username/password in backend/.env is correct
```

### Database Tables Not Found
```bash
# Verify schema imported
mysql appdb -e "SHOW TABLES;"

# If empty, reimport
mysql -u root -p appdb < appdb.sql
```

### Frontend Shows "Connection Refused"
```bash
# 1. Ensure backend is running: http://localhost:8000/health
# 2. Check NEXT_PUBLIC_API_URL in .env.local
# 3. Check browser console for specific error
# 4. Frontend cache: Clear browser cache or open in private window
```

### Image Upload Not Working
```bash
# Create uploads directory if missing
mkdir public/uploads

# Verify permissions
ls -la public/uploads  # Should be writable
```

## Stopping the Servers

### Backend
Press `Ctrl+C` in the terminal running the backend

### Frontend
Press `Ctrl+C` in the terminal running the frontend

## Next Steps

### Development
- See `MIGRATION.md` for details about the architecture migration
- Check `src/lib/api.ts` for how frontend connects to backend
- Backend routers in `backend/app/routers/` show API implementations

### Production Deployment
See README.md for production build commands

### Adding Features
- Add new API routes in `backend/app/routers/`
- Create new pages in `src/app/admin/`
- Keep frontend and backend in sync using `API_ENDPOINTS` from `src/lib/api.ts`

## Database Backup

### Backup Database
```bash
mysqldump -u root -p appdb > appdb_backup.sql
```

### Restore Database
```bash
mysql -u root -p appdb < appdb_backup.sql
```

## Quick Reference

| Task | Command |
|------|---------|
| Start Backend | `cd backend && python -m uvicorn app.main:app --reload --port 8000` |
| Start Frontend | `npm run dev` (from project root) |
| Access Admin | `http://localhost:3001/admin` (or 3002+ if port in use) |
| API Docs | `http://localhost:8000/docs` |
| Check Backend Health | `http://localhost:8000/health` |
| View MySQL | `mysql appdb -e "SHOW TABLES;"` |
| Reset Database | `mysql appdb -e "DROP DATABASE appdb; CREATE DATABASE appdb;"` then reimport |

## Additional Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [MySQL Docs](https://dev.mysql.com/doc/)
- [Python Virtual Environments](https://docs.python.org/3/tutorial/venv.html)

---

Once everything is running, you're ready to start managing temple attractions! 🏯✨

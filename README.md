# Temple Admin Dashboard

A modern temple attractions management system with a React frontend and FastAPI backend. Manage attractions, users, images, ratings, and categories with an intuitive admin interface.

## Architecture

- **Frontend**: React with Next.js & TypeScript (Admin UI) - Port 3000
- **Backend**: FastAPI Python (RESTful API) - Port 8000
- **Database**: MySQL with single schema (`appdb.sql`)

## Quick Start

### 1️⃣ Prerequisites
```bash
# Required:
- Node.js 18+
- Python 3.9+
- MySQL Server running
```

### 2️⃣ Database Setup
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE appdb;"

# Import schema
mysql -u root -p appdb < appdb.sql
```

### 3️⃣ Backend (FastAPI)
```bash
cd backend

# Setup Python
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install & run
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
✅ Backend: `http://localhost:8000`

### 4️⃣ Frontend (React)
```bash
# From project root
npm install
npm run dev
```
✅ Frontend: `http://localhost:3000/admin`

## Features

### Admin Dashboard
- 📍 **Attractions** - Create/edit/delete with categories and coordinates
- 👥 **Users** - Manage admin users and roles
- 🖼️ **Images** - Upload and link images to attractions
- ⭐ **Ratings** - View and manage attraction ratings
- 📑 **Categories** - Browse attraction categories

## API Endpoints

**Documented at:** `http://localhost:8000/docs`

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/attraction` | GET, POST | List/create attractions |
| `/api/attraction/{id}` | GET, PUT, DELETE | Attraction details |
| `/api/users` | GET, POST | List/create users |
| `/api/users/{id}` | GET, PUT, DELETE | User details |
| `/api/image` | GET, POST | Manage images |
| `/api/image/{id}` | GET, PUT, DELETE | Image details |
| `/api/image/upload` | POST | Upload file |
| `/api/rating` | GET, POST | Ratings |
| `/api/rating/{id}` | DELETE | Delete rating |
| `/api/category` | GET | View categories |
| `/api/district` | GET | View districts |
| `/api/type` | GET | View attraction types |
| `/api/sect` | GET | View Buddhist sects |

## Project Structure

```
temple_blackend/
├── src/                         # React Frontend
│   ├── app/
│   │   └── admin/              # Admin UI pages
│   │       ├── attractions/
│   │       ├── users/
│   │       ├── images/
│   │       ├── ratings/
│   │       └── category/
│   └── lib/api.ts              # API communication
├── backend/                     # FastAPI Backend
│   ├── app/
│   │   ├── main.py            # FastAPI app & CORS
│   │   ├── routers/           # API routes
│   │   ├── schemas/           # Pydantic models
│   │   └── core/
│   │       └── database.py    # MySQL connection
│   ├── requirements.txt
│   └── .env.example
├── appdb.sql                   # Database schema
├── MIGRATION.md                # From Next.js to FastAPI
└── README.md                   # This file
```

## Environment Configuration

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`backend/.env`)
```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=appdb
DB_PORT=3306
```

## Development Tips

### Change Ports
```bash
# Backend (other port)
python -m uvicorn app.main:app --port 9000

# Frontend (other port)
npm run dev -- -p 3001
```

### View Database Tables
```bash
mysql appdb -e "SHOW TABLES;"
mysql appdb -e "DESCRIBE attraction;"
```

### Debug API Calls
- Open http://localhost:8000/docs for interactive API explorer
- Check browser DevTools Network tab for frontend requests
- Backend logs show in terminal

## Production Deployment

### Frontend
```bash
npm run build
npm start
```

### Backend
```bash
cd backend
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```

## Common Issues

| Issue | Fix |
|-------|-----|
| Port already in use | Change port number (see above) |
| MySQL connection error | Verify MySQL running: `mysql -u root -p` |
| CORS errors | Backend CORS configured for localhost - adjust in `backend/app/main.py` |
| Blank frontend | Ensure backend running and check API URL in `.env.local` |
| Image upload fails | Check `public/uploads/` exists and is writable |
| Database not found | Run: `mysql appdb -e "SHOW TABLES;"` |

## Database Schema

Tables in `appdb.sql`:
- `attraction` - Main attractions data
- `attraction_category` - Many-to-many mapping
- `attraction_image` - Images for attractions
- `user` - Admin users
- `rating` - User ratings
- `category`, `district`, `type`, `sect` - Lookup tables

## Important Notes

⚠️ **Security (Development Only)**
- Passwords stored in plaintext - use bcrypt in production
- No authentication - add middleware for protected routes
- CORS open to localhost - restrict in production

✅ **Features**
- Responsive Tailwind UI
- MySQL connection pooling
- File upload with validation
- Transaction support for multi-table operations

## Support & Documentation

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- See `MIGRATION.md` for detailed migration info from old Next.js API routes

## License

Temple Admin Dashboard Project

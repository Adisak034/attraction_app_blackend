# Faith Tourism Recommendation API ⛩️

ระบบแนะนำสถานที่ท่องเที่ยวทางศรัทธา (Faith Tourism) โดยใช้เทคนิค User-Based Collaborative Filtering (UBCF) เพื่อแนะนำสถานที่ที่เหมาะสมกับความสนใจของผู้ใช้แต่ละคน

## Features ✨

- **User Authentication**: ระบบสมัครสมาชิกและเข้าสู่ระบบ
- **Recommendation Engine**: แนะนำสถานที่ท่องเที่ยวตามความคล้ายคลึงของผู้ใช้ (Collaborative Filtering)
- **Database Integration**: เชื่อมต่อกับ MySQL Database (`faith_tourism_db`)
- **RESTful API**: พัฒนาด้วย FastAPI

## System Architecture 🏗️

```mermaid
graph TD
    User[User / Client] -->|HTTP Request| Frontend[Frontend Application]
    Frontend -->|API Calls (JSON)| Backend[Backend API (FastAPI)]
    
    subgraph "Backend Server"
        Backend -->|Auth & User Data| DB[(MySQL Database)]
        Backend -->|Load Model| Model[UBCF Model (.pkl)]
        Backend -->|Process Data| Logic[Recommendation Logic]
        Logic -->|Read| Model
    end
    
    DB -->|Attraction Data| Logic
    Logic -->|Personalized List| Backend
    Backend -->|JSON Response| Frontend
```

## Tech Stack 🛠️

- **Language**: Python 3.8+
- **Framework**: FastAPI
- **Database**: MySQL
- **Data Science Libs**: Pandas, Scikit-learn
- **Server**: Uvicorn

## Installation & Setup 🚀

### 1. Clone Repository

```bash
git clone https://github.com/wit238/MU_NPRU.git
cd MU_NPRU
```

### 2. Set up Virtual Environment (Optional but Recommended)

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install fastapi uvicorn pandas mysql-connector-python scikit-learn pydantic
```

### 4. Database Setup

1.  ต้องมี MySQL Server ติดตั้งในเครื่อง (เช่นผ่าน XAMPP หรือ MySQL Installer)
2.  สร้าง Database ชื่อ `faith_tourism_db`
3.  ตรวจสอบการตั้งค่าเชื่อมต่อในไฟล์ `main.py`:
    ```python
    def get_db_connection():
        return mysql.connector.connect(
            host="localhost",
            port=3306,
            user="root",        # แก้ไข username ตามเครื่องของคุณ
            password="",        # แก้ไข password ตามเครื่องของคุณ
            database="faith_tourism_db"
        )
    ```

## Running the API ▶️

Start server ด้วยคำสั่ง:

```bash
uvicorn main:app --reload
```

API จะทำงานที่: `http://127.0.0.1:8000`

## API Endpoints 📡

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Welcome Message |
| `POST` | `/register` | สมัครสมาชิกใหม่ |
| `POST` | `/login` | เข้าสู่ระบบ |
| `GET` | `/test-db` | ตรวจสอบการเชื่อมต่อฐานข้อมูล |
| `GET` | `/recommend/{user_id}` | ขอคำแนะนำสถานที่ท่องเที่ยวสำหรับ User ID นั้นๆ |

## Project Structure 📂

```
MU_NPRU/
├── frontend/             # Frontend source code (if applicable)
├── main.py               # Main FastAPI application
├── diagnose_types.py     # Script to diagnose data types/model
├── inspect_model.py      # Script to inspect pickle model
├── ubcf_model.pkl        # Pre-trained recommendation model
├── .gitignore            # Git ignore rules
└── README.md             # Project documentation
```

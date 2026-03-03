# main.py
import pickle
import traceback
import math
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import mysql.connector
from sklearn.metrics.pairwise import cosine_similarity

# Global variables for models
models = {
    'finance': {'user_similarity': None, 'user_item_matrix': None},
    'love': {'user_similarity': None, 'user_item_matrix': None},
    'work': {'user_similarity': None, 'user_item_matrix': None}
}

# Password Hashing
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load each model from its own file on startup
    global models
    try:
        for category in ['finance', 'love', 'work']:
            with open(f"recommendation_model_{category}.pkl", "rb") as f:
                data = pickle.load(f)
                models[category]['user_similarity'] = data.get('user_similarity_df')
                models[category]['user_item_matrix'] = data.get('user_item_matrix')
            print(f"Model loaded successfully from recommendation_model_{category}.pkl")
    except Exception as e:
        print(f"Error loading model: {e}")
    yield

app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class RegisterUser(BaseModel):
    user_name: str
    password: str

class LoginUser(BaseModel):
    user_name: str
    password: str

class RatingReq(BaseModel):
    user_id: int
    attraction_id: int
    work: int       # 1-5
    finance: int    # 1-5
    love: int       # 1-5


def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        port=3306,
        user="root",
        password="", 
        database="appdb"
    )

# 0. ตรวจสอบและสร้างตาราง Users
def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                user_name VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user'
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error initializing DB: {e}")

init_db()

@app.post("/register")
def register(user: RegisterUser):
    try:
        # Password Policy Check
        if len(user.password) < 8:
            return {"status": "error", "message": "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร"}
        if not user.password[0].isupper():
            return {"status": "error", "message": "ตัวอักษรแรกของรหัสผ่านต้องเป็นตัวพิมพ์ใหญ่ (A-Z)"}

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM users WHERE user_name = %s", (user.user_name,))
        if cursor.fetchone():
            conn.close()
            return {"status": "error", "message": "ชื่อนี้มีในระบบแล้ว"}
        sql = "INSERT INTO users (user_name, password, role) VALUES (%s, %s, %s)"
        # Truncate password to 72 bytes before hashing
        hashed_password = pwd_context.hash(str(user.password)[:72])  # type: ignore[index]
        cursor.execute(sql, (user.user_name, hashed_password, 'user'))
        conn.commit()
        u_id = cursor.lastrowid
        conn.close()
        return {"status": "success", "user_id": str(u_id), "user_name": user.user_name, "role": "user"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/login")
def login(user: LoginUser):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id, user_name, password, role FROM users WHERE user_name = %s", (user.user_name,))
        row = cursor.fetchone()
        conn.close()
        
        # Verify with truncated password
        if row and pwd_context.verify(str(user.password)[:72], row['password']):  # type: ignore[index]
             role = row.get('role') or 'user'
             return {"status": "success", "user_id": str(row['user_id']), "user_name": row['user_name'], "role": role}
        else:
             return {"status": "error", "message": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/")
def home():
    return {"message": "Welcome to Faith Tourism API ⛩️"}

# Activity Logging disabled (Constant Model approach)

@app.post("/api/rating")
def submit_rating(req: RatingReq):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Auto-create ratings table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ratings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                attraction_id INT NOT NULL,
                work TINYINT NOT NULL,
                finance TINYINT NOT NULL,
                love TINYINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute(
            "INSERT INTO ratings (user_id, attraction_id, work, finance, love) VALUES (%s, %s, %s, %s, %s)",
            (req.user_id, req.attraction_id, req.work, req.finance, req.love)
        )
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Rating saved"}
    except Exception as e:
        print(f"Rating error: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/test-db")
def test_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        schema_info = {}
        for table in tables:
            table_name = list(table.values())[0]
            cursor.execute(f"DESCRIBE {table_name}")
            columns = cursor.fetchall()
            schema_info[table_name] = [col['Field'] for col in columns]
        conn.close()
        return {"status": "Connected Successfully! ", "database": "faith_tourism_db", "tables_found": list(schema_info.keys()), "schema_details": schema_info}
    except Exception as e:
        return {"status": "Connection Failed", "error": str(e)}

@app.get("/status")
def status():
    return {
        "models_loaded": {cat: mats['user_similarity'] is not None for cat, mats in models.items()},
    }

@app.get("/recommend/{user_id}")
def recommend(user_id: str):
    try:
        global models
        
        all_models_missing = all(v['user_similarity'] is None for v in models.values())
        
        if all_models_missing:
            return {"error": "ระบบแนะนำยังไม่พร้อม กรุณาลองใหม่อีกครั้งในอีกไม่กี่นาที"}

        conn = get_db_connection()
        df_places = pd.read_sql("SELECT * FROM attraction", conn)
        conn.close()

        if df_places.empty:
            return {"error": "Attractions database is empty."}
            
        # Header row removed from DB, so no need to filter

        # Convert user_id to int for matrix lookup (matrix index is int)
        try:
            uid_int = int(user_id)
        except (ValueError, TypeError):
            uid_int = None

        target_user_id = uid_int
        is_new_user = False
        print(f"DEBUG: Request user_id='{user_id}' -> int={uid_int}")

        found_in_any = False
        if uid_int is not None:
            for cat, mats in models.items():
                mat = mats['user_item_matrix']
                if mat is not None and uid_int in mat.index:
                    found_in_any = True
                    break

        if not found_in_any:
            print(f"DEBUG: User {uid_int} not found in any model. Using popularity fallback.")
            is_new_user = True

        # model name -> category label
        model_category_map = {
            'finance': 'การเงิน',
            'love': 'ความรัก',
            'work': 'การงาน'
        }

        # Check if user exists in any model
        my_visited_set = set()
        found_in_any = uid_int is not None and any(
            mats['user_item_matrix'] is not None and uid_int in mats['user_item_matrix'].index  # type: ignore[union-attr]
            for mats in models.values()
        )

        # --- Build per-model scores, then sort within each model ---
        all_results_entries = []  # list of (score, place_id, cat_label)

        for cat, mats in models.items():
            sim_matrix = mats['user_similarity']
            item_matrix = mats['user_item_matrix']
            cat_label = model_category_map[cat]
            if item_matrix is None or sim_matrix is None:
                continue

            # Popularity baseline: sum(axis=0) per model
            col_sums = item_matrix.sum(axis=0)  # type: ignore[union-attr]
            pop_scores = {col: float(col_sums[col]) for col in item_matrix.columns if float(col_sums[col]) > 0}  # type: ignore[union-attr]

            # Collaborative Filtering (only if user in this model)
            cf_scores = {}
            if found_in_any and uid_int in item_matrix.index:  # type: ignore[union-attr]
                cat_visited = item_matrix.loc[uid_int][item_matrix.loc[uid_int] > 0].index.tolist()  # type: ignore[union-attr]
                my_visited_set.update(cat_visited)
                similar_users = sim_matrix[uid_int].sort_values(ascending=False)[1:6]  # type: ignore[index,union-attr]
                for sim_user, sim_score in similar_users.items():
                    their_ratings = item_matrix.loc[sim_user]  # type: ignore[union-attr]
                    for place_id, rating in their_ratings.items():
                        if float(rating) > 0 and place_id not in my_visited_set:
                            cf_scores[place_id] = cf_scores.get(place_id, 0.0) + float(rating) * float(sim_score)

            # Choose: use CF if meaningful (max CF > 0.5), else use popularity
            max_cf = max(cf_scores.values(), default=0.0)
            if max_cf >= 0.5:
                # Blend: normalize CF to same scale as popularity then sum
                cf_max = max_cf
                pop_max = max(pop_scores.values(), default=1.0)
                for place_id in set(list(cf_scores.keys()) + list(pop_scores.keys())):
                    cf_s = cf_scores.get(place_id, 0.0) / cf_max * pop_max
                    pop_s = pop_scores.get(place_id, 0.0)
                    final_score = cf_s * 0.7 + pop_s * 0.3
                    if final_score > 0:
                        all_results_entries.append((final_score, place_id, cat_label))
            else:
                # Popularity fallback (matches matrix.sum(axis=0))
                for place_id, score in pop_scores.items():
                    all_results_entries.append((score, place_id, cat_label))

        # Sort globally by score desc, limit to 150
        all_results_entries.sort(key=lambda x: x[0], reverse=True)

        # Build recommended_scores dict for result building
        recommended_scores = {}
        for score, place_id, cat_label in list(all_results_entries)[:150]:  # type: ignore[misc]
            rec_key = f"{place_id}_{cat_label}"
            if rec_key not in recommended_scores:
                recommended_scores[rec_key] = {'place_id': place_id, 'score': score, 'category': cat_label}

        # Mapping dictionaries
        type_mapping = {
            "7": "วัด",
            "10": "ศาลเจ้า",
            "11": "สถานที่ปฏิบัติธรรม",
            "12": "โบราณสถาน"
        }

        # Google Maps API Key
        primary_api_key = "AIzaSyCui4h5-VBB9WmGWP6u8M0il3g7iKqJ56E"

        sorted_recs = list(sorted(recommended_scores.items(), key=lambda x: x[1]['score'], reverse=True))[:150]  # type: ignore[misc]
        results = []
        
        # Replace pd.NA and np.nan with None in df_places to avoid JSON NaN error
        df_places = df_places.replace({np.nan: None})
        
        for _key, rec_data in sorted_recs:
            place_id = rec_data['place_id']
            score = rec_data['score']
            category_name = rec_data['category']
            # Convert DB ID to int for safe comparison
            place_info = df_places[df_places['attraction_id'].astype(int) == int(place_id)]
            
            if not place_info.empty:
                row = place_info.iloc[0]

                raw_type = str(row['type_id']) if 'type_id' in row else "Unknown"
                type_name = type_mapping.get(raw_type, "วัด")
                place_name = str(row['attraction_name']) if 'attraction_name' in row else "Unknown"

                # 0. Check Database for Image URL (column: attraction_image)
                image_url = row['attraction_image'] if 'attraction_image' in row and row['attraction_image'] else ""

                # 1. Local image map — ชื่อไฟล์ตรงกับที่ใส่ใน frontend/public/images/temples/
                if not image_url:
                    local_image_map = {
                        # 6 ไฟล์ที่ user อัปโหลดแล้ว
                        "วัดสามง่าม":           "/images/temples/วัดสามง่าม.png",
                        "วัดกลางบางแก้ว":       "/images/temples/วัดกลางบางแก้ว.png",
                        "วัดสว่างอารมณ์":       "/images/temples/วัดสว่างอารมณ์.png",
                        "วัดส่างอารมณ์":        "/images/temples/วัดสว่างอารมณ์.png",  # ชื่อ DB อาจต่างกัน
                        "วัดไร่ขิง":            "/images/temples/วัดไร่ขิง.png",
                        "วัดไผ่ล้อม":           "/images/temples/วัดไผ่ล้อม.png",
                        "วัดบางพระ":            "/images/temples/วัดบางพระ.png",
                        # ยังไม่มีไฟล์ — เพิ่มทีหลัง (ใชื่อไฟล์ภาษาไทยเหมือนกัน)
                        "วัดพระปฐมเจดีย์":      "/images/temples/วัดพระปฐมเจดีย์.png",
                        "วัดม่วงตาร":           "/images/temples/วัดม่วงตาร.png",
                        "วัดหนองงูเหลือม":      "/images/temples/วัดหนองงูเหลือม.png",
                        "วัดศีรษะทอง":          "/images/temples/วัดศีรษะทอง.jpeg",
                        "วัดพระงาม":            "/images/temples/วัดพระงาม.png",
                        "วัดดอนยายหอม":         "/images/temples/วัดดอนยายหอม.png",
                        "ศาลเจ้าพ่อหลักเมือง":  "/images/temples/ศาลเจ้าพ่อหลักเมือง.png",
                        "วัดสระสี่เหลี่ยม":     "/images/temples/วัดสระสี่เหลี่ยม.png",
                        "วัดบ่อตะกั่วพุทธาราม": "/images/temples/วัดบ่อตะกั่วพุทธาราม.png",
                    }
                    for key_name, local_path in local_image_map.items():
                        if key_name in str(place_name):
                            image_url = local_path
                            break


                # 2. Fallback — verified Thai temple Unsplash images (while local photos not yet added)
                if not image_url:
                    if "ศาลเจ้า" in type_name or "ศาลเจ้า" in place_name:
                        temple_pool = [
                            "https://images.unsplash.com/photo-1595180492817-291771120428?q=80&w=800",
                            "https://images.unsplash.com/photo-1544211320-9a3d4f828734?q=80&w=800",
                        ]
                    elif "โบราณสถาน" in type_name:
                        temple_pool = [
                            "https://images.unsplash.com/photo-1582234032483-c287042531cd?q=80&w=800",
                            "https://images.unsplash.com/photo-1563603417646-77869680c2f8?q=80&w=800",
                        ]
                    else:
                        temple_pool = [
                            "https://images.unsplash.com/photo-1599725427295-5847fa279543?q=80&w=800",
                            "https://images.unsplash.com/photo-1563603417646-77869680c2f8?q=80&w=800",
                            "https://images.unsplash.com/photo-1528181304800-259b0884852d?q=80&w=800",
                            "https://images.unsplash.com/photo-1507646903823-74b21e721a32?q=80&w=800",
                            "https://images.unsplash.com/photo-1544211320-9a3d4f828734?q=80&w=800",
                            "https://images.unsplash.com/photo-1582234032483-c287042531cd?q=80&w=800",
                            "https://images.unsplash.com/photo-1595180492817-291771120428?q=80&w=800",
                        ]
                    image_url = temple_pool[int(place_id) % len(temple_pool)]






                def safe_str(val):
                    if val is None:
                        return "-"
                    try:
                        if pd.isna(val):
                            return "-"
                    except (TypeError, ValueError):
                        pass
                    return str(val).strip() or "-"

                def safe_float(val, is_latlng=False):
                    if val is None:
                        return 0.0
                    try:
                        if pd.isna(val):
                            return 0.0
                        
                        # Handle specific string cases
                        if isinstance(val, str):
                            v_upper = val.strip().upper()
                            if is_latlng and v_upper in ('LAT', 'LONG', 'LNG'):
                                return 0.0
                            if not val.strip():
                                return 0.0
                                
                        f_val = float(val)
                        if math.isnan(f_val) or math.isinf(f_val):
                            return 0.0
                            
                        return f_val
                    except (TypeError, ValueError):
                        return 0.0

                results.append({
                    "id": str(place_id),
                    "name": place_name,
                    "type": type_name,
                    "category": category_name,
                    "lat": safe_float(row.get('lat'), is_latlng=True),
                    "lng": safe_float(row.get('lng'), is_latlng=True),
                    "score": round(float(safe_float(score)), 2),  # type: ignore[call-overload]
                    "image": image_url or "",
                    "sacred_object": safe_str(row.get('sacred_obj')) if 'sacred_obj' in row else "-",
                    "offerings": safe_str(row.get('offering')) if 'offering' in row else "-"
                })

        return {"user_id": user_id, "matched_id": target_user_id, "recommendations": results, "message": f"Showing recommendations for User {target_user_id}" if user_id != target_user_id else ""}

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e), "detail": traceback.format_exc()})

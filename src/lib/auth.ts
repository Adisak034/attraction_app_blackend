// =============================================================================
// auth.ts
// =============================================================================
// ระบบจัดการ Session ของผู้ใช้ผ่าน localStorage
// ใช้สำหรับ login/logout และ route protection ใน main.tsx
//
// ความสามารถหลัก:
//   - getAuthSession()   - ดึง session ปัจจุบัน (คืน null ถ้าไม่ได้ login)
//   - setAuthSession()   - บันทึก session หลัง login สำเร็จ
//   - clearAuthSession() - ลบ session เมื่อ logout
//
// โครงสร้าง AuthSession:
//   { user_id, user_name, role }   - role: 'user' | 'admin' | 'user_model'
//
// Key ใน localStorage: 'auth_session'
// =============================================================================

// ประเภทข้อมูลของ session ผู้ใช้งานที่ login อยู่
export type AuthSession = {
  user_id: number;   // ID ผู้ใช้
  user_name: string; // ชื่อผู้ใช้
  role: string;      // บทบาท (user / admin)
};

// key สำหรับบันทึก session ใน localStorage
const AUTH_STORAGE_KEY = 'auth_session';

// ดึงข้อมูล session ของผู้ใช้จาก localStorage
// คืน null ถ้าไม่มี session หรือข้อมูลไม่ครบ
export function getAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    // ตรวจสอบว่าข้อมูลครบถ้วน
    if (!parsed?.user_id || !parsed?.user_name || !parsed?.role) return null;
    return parsed;
  } catch {
    return null; // คืน null ถ้า JSON parse ล้มเหลว
  }
}

// บันทึก session ผู้ใช้ลงใน localStorage หลัง login สำเร็จ
export function setAuthSession(session: AuthSession) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

// ลบ session ออกจาก localStorage (ใช้ตอน logout)
export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

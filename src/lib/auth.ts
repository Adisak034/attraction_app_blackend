// =============================================================================
// auth.ts
// =============================================================================
// ระบบจัดการ Session ของผู้ใช้ผ่าน localStorage
// ใช้สำหรับ login/logout และ route protection ใน main.tsx และคอมโพเนนต์ต่างๆ
//
// ความสามารถหลัก:
//   - getAuthSession()   - ดึง session ปัจจุบัน (คืน null ถ้าไม่ได้ login)
//   - setAuthSession()   - บันทึก session หลัง login สำเร็จ
//   - clearAuthSession() - ลบ session เมื่อ logout
//   - isAuthenticated()  - ตรวจสอบว่ามีการล็อกอินอยู่หรือไม่ (boolean)
//   - isAdmin()          - ตรวจสอบว่าผู้ใช้ปัจจุบันมีสิทธิ์แอดมินหรือไม่ (boolean)
// =============================================================================

export interface AuthSession {
  user_id: number;
  user_name: string;
  role: string; // 'user' | 'admin' | 'user_model'
}

const AUTH_STORAGE_KEY = 'auth_session';

// =============================================================================
// Session Getters & Setters
// =============================================================================

/**
 * ดึงข้อมูล session ของผู้ใช้จาก localStorage
 * คืนค่า null ถ้าไม่มี session หรือข้อมูลไม่ครบถ้วน
 */
export function getAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.user_id || !parsed?.user_name || !parsed?.role) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * บันทึก session ผู้ใช้ลงใน localStorage หลัง login สำเร็จ
 */
export function setAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

/**
 * ลบ session ออกจาก localStorage (ใช้ตอน logout)
 */
export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// =============================================================================
// Status Checkers (Utilities)
// =============================================================================

/**
 * ตรวจสอบสถานะการเข้าสู่ระบบ
 */
export function isAuthenticated(): boolean {
  return getAuthSession() !== null;
}

/**
 * ตรวจสอบสิทธิ์ผู้ดูแลระบบ (Admin)
 */
export function isAdmin(): boolean {
  const session = getAuthSession();
  return session?.role === 'admin';
}

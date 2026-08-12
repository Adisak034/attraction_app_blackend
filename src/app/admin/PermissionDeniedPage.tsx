// =============================================================================
// app/admin/admin-permission/page.tsx
// =============================================================================
// หน้าแจ้งเตือนเมื่อผู้ใช้ login แล้วแต่ไม่มีสิทธิ์เข้า admin (/admin/admin-permission)
// แสดงข้อความแจ้งเตือนและมีปุ่มให้เลือก:
//   - ไปหน้า User (กลับไปหน้าหลัก)
//   - ออกจากระบบ (clearAuthSession แล้ว redirect หน้าหลัก)
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession } from '@/lib/auth';

// =============================================================================
// Sub-Components
// =============================================================================

interface UserSessionBadgeProps {
  userName?: string | null;
  role?: string | null;
}

function UserSessionBadge({ userName, role }: UserSessionBadgeProps) {
  if (!userName) return null;

  return (
    <div className="mb-6">
      <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm border">
        ผู้ใช้ปัจจุบัน: <strong className="font-semibold text-gray-900">{userName}</strong> ({role || 'unknown'})
      </span>
    </div>
  );
}

interface PermissionActionButtonsProps {
  onGoHome: () => void;
  onLogout: () => void;
}

function PermissionActionButtons({ onGoHome, onLogout }: PermissionActionButtonsProps) {
  return (
    <div className="space-y-3">
      <button
        onClick={onGoHome}
        className="w-full bg-blue-600 text-white py-2.5 rounded-md font-semibold hover:bg-blue-700 transition shadow-sm"
      >
        ไปหน้า User
      </button>

      <button
        onClick={onLogout}
        className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-md font-semibold hover:bg-gray-200 transition border border-gray-200"
      >
        ออกจากระบบ และเข้าสู่ระบบใหม่
      </button>
    </div>
  );
}


// =============================================================================
// Main Component
// =============================================================================

export default function PermissionDeniedPage() {
  const navigate = useNavigate();
  const session = getAuthSession();

  // จัดการกลับไปยังหน้าหลักของผู้ใช้งาน
  const handleGoToHome = () => {
    navigate('/', { replace: true });
  };

  // จัดการล้างข้อมูล Session ออกจากระบบ และกลับไปยังหน้าหลัก
  const handleLogoutAndRelogin = () => {
    clearAuthSession();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-md border p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ไม่สามารถเข้าใช้งานหน้า Admin ได้
        </h1>
        <p className="text-gray-600 mb-4">
          บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ
        </p>

        {/* แสดงข้อมูลบัญชีและสิทธิ์ของผู้ใช้ปัจจุบัน */}
        <UserSessionBadge
          userName={session?.user_name}
          role={session?.role}
        />

        {/* ปุ่มเลือกดำเนินการ */}
        <PermissionActionButtons
          onGoHome={handleGoToHome}
          onLogout={handleLogoutAndRelogin}
        />
      </div>
    </div>
  );
}

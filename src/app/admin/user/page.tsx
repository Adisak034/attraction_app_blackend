import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession } from '@/lib/auth';

export default function AdminUserBlockedPage() {
  const navigate = useNavigate();
  const session = getAuthSession();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-md border p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ไม่สามารถเข้าใช้งานหน้า Admin ได้</h1>
        <p className="text-gray-600 mb-2">บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ</p>
        {session?.user_name && (
          <p className="text-sm text-gray-500 mb-6">ผู้ใช้ปัจจุบัน: {session.user_name} ({session.role})</p>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700"
          >
            ไปหน้า User
          </button>

          <button
            onClick={() => {
              clearAuthSession();
              navigate('/', { replace: true });
            }}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-md font-semibold hover:bg-gray-200"
          >
            ออกจากระบบ และเข้าสู่ระบบใหม่
          </button>
        </div>
      </div>
    </div>
  );
}

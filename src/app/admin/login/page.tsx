import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/apiClient';
import { getAuthSession, setAuthSession } from '@/lib/auth';

type UserRow = {
  user_id: number;
  user_name: string;
  password: string;
  role: string;
};

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) return;

    if (session.role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/admin/user', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const users = (await apiGet('/api/users')) as UserRow[];
      const found = users.find((item) => item.user_name === userName && item.password === password);

      if (!found) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        return;
      }

      setAuthSession({
        user_id: found.user_id,
        user_name: found.user_name,
        role: found.role || 'user',
      });

      if (found.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/admin/user', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Login</h1>
        <p className="text-sm text-gray-600 mb-6">เฉพาะผู้ใช้งานที่มีสิทธิ์ผู้ดูแลระบบ</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-md font-semibold hover:bg-gray-200"
          >
            กลับหน้าแรก
          </button>
        </form>
      </div>
    </div>
  );
}

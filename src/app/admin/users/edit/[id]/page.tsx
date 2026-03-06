import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPut } from '@/lib/apiClient';
import { showError, showSuccess } from '@/lib/swal';

interface User {
  user_id: number;
  user_name: string;
  password: string;
  role: string | null;
}

export default function EditUserPage() {
  const navigate = useNavigate();
  const params = useParams();
  const userId = params.id as string;
  
  const [formData, setFormData] = useState<Partial<User>>({
    user_name: '',
    password: '',
    role: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
    }
  }, [userId]);

  const fetchUser = async (id: string) => {
    try {
      setLoading(true);
      const data = await apiGet(`/api/users/${parseInt(id)}`);
      setFormData({
        user_name: data.user_name || '',
        password: data.password || '',
        role: data.role || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!formData.user_name?.trim()) {
      await showError('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อผู้ใช้');
      return;
    }

    try {
      await apiPut(`/api/users/${parseInt(userId)}`, {
        user_name: formData.user_name,
        password: formData.password,
        role: formData.role || null,
      });
      await showSuccess('แก้ไขสำเร็จ', `แก้ไขข้อมูลผู้ใช้ "${formData.user_name.trim()}" เรียบร้อยแล้ว`);
      navigate('/admin/users', { replace: true });
    } catch (err) {
      await showError('เกิดข้อผิดพลาด', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      <h1 className="text-2xl font-bold mb-4">Edit User</h1>

      <div className="p-6 border rounded-lg shadow-lg bg-white">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1">
            <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              id="user_name"
              name="user_name"
              value={formData.user_name || ''}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded-md shadow-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password || ''}
              onChange={handleInputChange}
              placeholder="Leave blank to keep current password"
              className="w-full p-2 border rounded-md shadow-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md shadow-sm"
            >
              <option value="">Select Role</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="user_model">User Model</option>
            </select>
          </div>

          <div className="md:col-span-2 flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 font-semibold"
            >
              Update User
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/users', { replace: true })}
              className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-md shadow-md hover:bg-gray-500 font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

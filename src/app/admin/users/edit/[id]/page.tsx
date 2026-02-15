'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  user_id: number;
  user_name: string;
  password: string;
  birth_date: string | null;
  role: string | null;
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    user_name: '',
    password: '',
    birth_date: '',
    role: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlockParams = async () => {
      const { id } = await params;
      setUserId(id);
      fetchUser(id);
    };
    unlockParams();
  }, [params]);

  const fetchUser = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      const data = await response.json();
      setFormData({
        user_name: data.user_name || '',
        password: data.password || '',
        birth_date: data.birth_date ? data.birth_date.split('T')[0] : '',
        role: data.role || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!formData.user_name?.trim()) {
      alert('Username is required.');
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: formData.user_name,
          password: formData.password,
          birth_date: formData.birth_date || null,
          role: formData.role || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      alert('User updated successfully!');
      router.push('/admin/users');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-4">
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
            <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-1">
              Birth Date
            </label>
            <input
              type="date"
              id="birth_date"
              name="birth_date"
              value={formData.birth_date || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md shadow-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              id="role"
              name="role"
              value={formData.role || ''}
              onChange={handleInputChange}
              placeholder="e.g., user, admin"
              className="w-full p-2 border rounded-md shadow-sm"
            />
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
              onClick={() => router.push('/admin/users')}
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

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Interface based on the 'user' table schema
interface User {
  user_id: number;
  user_name: string;
  birth_date: string | null;
  role: string | null;
}

const initialFormState = {
  user_name: '',
  password: '',
  birth_date: '',
  role: 'user', // Default role
};

export default function UserAdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.user_name.trim() || !formData.password.trim()) {
        alert('Username and Password are required.');
        return;
    }
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...formData,
            birth_date: formData.birth_date || null, // Send null if empty
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      setFormData(initialFormState);
      fetchUsers(); // Refresh the list
      alert('User created successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }

      fetchUsers(); // Refresh the list
      alert('User deleted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>

      <div className="mb-6 p-6 border rounded-lg shadow-lg bg-white">
        <h2 className="text-xl font-semibold mb-4">Add New User</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1">
            <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input type="text" id="user_name" name="user_name" value={formData.user_name} onChange={handleInputChange} required className="w-full p-2 border rounded-md shadow-sm" />
          </div>
          <div className="md:col-span-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleInputChange} required className="w-full p-2 border rounded-md shadow-sm" />
          </div>
          <div className="md:col-span-1">
            <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
            <input type="date" id="birth_date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm" />
          </div>
          <div className="md:col-span-1">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input type="text" id="role" name="role" value={formData.role} onChange={handleInputChange} placeholder="e.g., user, admin" className="w-full p-2 border rounded-md shadow-sm" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="w-full bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 font-semibold">
              Add User
            </button>
          </div>
        </form>
      </div>

      <div className="p-4 border rounded-lg shadow-md bg-white">
        <h2 className="text-xl font-semibold mb-2">Existing Users</h2>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">ID</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Username</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Birth Date</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Role</th>
                  <th className="py-3 px-4 border-b text-center text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm font-medium text-gray-500">{user.user_id}</td>
                    <td className="py-2 px-4 border-b text-sm">{user.user_name}</td>
                    <td className="py-2 px-4 border-b text-sm">{user.birth_date ? new Date(user.birth_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="py-2 px-4 border-b text-sm">{user.role}</td>
                    <td className="py-2 px-4 border-b text-sm text-center">
                      <div className="flex flex-col gap-2 items-center">
                        <button
                          onClick={() => router.push(`/admin/users/edit/${user.user_id}`)}
                          className="bg-blue-500 text-white px-4 py-1 rounded text-xs font-medium hover:bg-blue-600 w-full"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.user_id)}
                          className="bg-red-500 text-white px-4 py-1 rounded text-xs font-medium hover:bg-red-600 w-full"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

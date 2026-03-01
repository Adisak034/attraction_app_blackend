import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DataTable from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { apiGet, apiPost, apiDelete } from '@/lib/apiClient';

// Interface based on the 'user_model' table schema
interface User {
  user_id: number;
  user_name: string;
  password: string;
  role: string;
}

const initialFormState = {
  user_name: '',
  password: '',
  role: 'user', // Default role
};

export default function UserAdminPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableRef = useRef<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const closeAddModal = () => {
    setShowForm(false);
    setFormData(initialFormState);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/api/users');
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

  useEffect(() => {
    if (loading) return;
    if (!tableRef.current) return;

    if (dataTableRef.current) {
      dataTableRef.current.destroy();
      dataTableRef.current = null;
    }

    if (users.length === 0) return;

    dataTableRef.current = new DataTable(tableRef.current, {
      pageLength: 10,
      lengthMenu: [5, 10, 20, 50],
      searching: true,
      ordering: true,
      paging: true,
      info: true,
      dom: 'lrtip',
    });

    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, [loading, users]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      await apiPost('/api/users', {
        user_name: formData.user_name,
        password: formData.password,
        role: formData.role,
      });

      closeAddModal();
      await fetchUsers();
      navigate('/admin/users', { replace: true });
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
      await apiDelete(`/api/users/${userId}`);

      fetchUsers();
      alert('User deleted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  useEffect(() => {
    const tableElement = tableRef.current;
    if (!tableElement) return;

    const handleTableClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const editButton = target.closest('.edit-user-btn') as HTMLButtonElement | null;
      const deleteButton = target.closest('.delete-user-btn') as HTMLButtonElement | null;

      if (editButton) {
        const userId = Number(editButton.dataset.userId);
        if (Number.isFinite(userId)) {
          navigate(`/admin/users/edit/${userId}`);
        }
        return;
      }

      if (deleteButton) {
        const userId = Number(deleteButton.dataset.userId);
        if (Number.isFinite(userId)) {
          handleDelete(userId);
        }
      }
    };

    tableElement.addEventListener('click', handleTableClick);
    return () => tableElement.removeEventListener('click', handleTableClick);
  }, [users, navigate]);

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      {/* Header with Title and Add Button */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            aria-label="ย้อนกลับ"
            title="ย้อนกลับ"
            className="h-10 w-10 flex items-center justify-center border rounded-md text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setFormData(initialFormState);
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-md shadow-md hover:bg-blue-700 font-semibold"
        >
          + Add User
        </button>
      </div>

      {/* Add User Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Add New User</h2>
              <button onClick={closeAddModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input type="text" id="user_name" name="user_name" value={formData.user_name} onChange={handleInputChange} required className="w-full p-2 border rounded-md shadow-sm" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleInputChange} required className="w-full p-2 border rounded-md shadow-sm" />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select id="role" name="role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full p-2 border rounded-md shadow-sm">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="md:col-span-3 flex gap-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 font-semibold">
                  Add User
                </button>
                <button type="button" onClick={closeAddModal} className="flex-1 bg-gray-300 text-gray-800 px-6 py-3 rounded-md shadow-md hover:bg-gray-400 font-semibold">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Users</h2>
        </div>
        {error && <p className="text-red-500 mb-4 p-6">{error}</p>}
        {loading && <p className="text-gray-500 p-6">Loading...</p>}
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full display compact hover stripe">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id} data-id={user.user_id}>
                  <td>{user.user_id}</td>
                  <td>{user.user_name}</td>
                  <td>{user.role || '-'}</td>
                  <td>••••••••</td>
                  <td>
                    <div className="flex gap-2 justify-center">
                      <button type="button" className="edit-user-btn bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition shadow-sm" data-user-id={user.user_id}>Edit</button>
                      <button type="button" className="delete-user-btn bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-700 transition shadow-sm" data-user-id={user.user_id}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

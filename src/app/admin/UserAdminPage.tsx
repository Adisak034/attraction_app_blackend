// =============================================================================
// app/admin/users/page.tsx
// =============================================================================
// หน้าจัดการผู้ใช้ (/admin/users)
// แสดงและจัดการบัญชีผู้ใช้ทั้งหมดในระบบ
//
// ความสามารถหลัก:
//   - แสดงตารางผู้ใช้ทั้งหมด (ID, ชื่อ, Role, Password แบบปิด)
//   - เพิ่มผู้ใช้ใหม่ผ่าน Modal Form (username, password, role)
//   - ลบผู้ใช้ (พร้อม confirm dialog)
//   - คลิก Edit → ไปหน้า /admin/users/edit/:id หรือแก้ไขผ่าน Modal Form
//   - highlight แถวที่เพิ่ง edit ด้วยสีเหลือง 3 วินาที
//   - Role ที่รองรับ: user, admin, user_model
//
// API ที่เรียก:
//   GET    /api/users      - ดึงผู้ใช้ทั้งหมด
//   POST   /api/users      - เพิ่มผู้ใช้ใหม่
//   PUT    /api/users/:id  - แก้ไขข้อมูลผู้ใช้
//   DELETE /api/users/:id  - ลบผู้ใช้
// =============================================================================

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table } from './components/Table';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/apiClient';
import { confirmAction, showError, showInfo, showSuccess } from '@/lib/swal';

// =============================================================================
// Types & Initial States
// =============================================================================

interface User {
  user_id: number;
  user_name: string;
  password: string;
  role: string;
}

interface UserFormData {
  user_name: string;
  password: string;
  role: string;
}

const initialFormState: UserFormData = {
  user_name: '',
  password: '',
  role: 'user',
};


// =============================================================================
// Helper Functions: CSV Export 
// =============================================================================

/** แปลงข้อความให้ปลอดภัยสำหรับการส่งออกไฟล์ CSV */
function escapeCsv(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** ส่งออกข้อมูลผู้ใช้งานทั้งหมดเป็นไฟล์ CSV */
function exportUsersToCsv(users: User[]): void {
  if (users.length === 0) {
    void showInfo('ไม่มีข้อมูล', 'ไม่มีข้อมูลผู้ใช้งานสำหรับส่งออก');
    return;
  }

  const headers = ['user_id', 'user_name', 'role'];
  const rows = users.map((u) => [u.user_id, u.user_name, u.role || 'user']);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


// =============================================================================
// Sub-Components (UI Modularization)
// =============================================================================

interface UserRoleBadgeProps {
  role: string | null | undefined;
}

function UserRoleBadge({ role }: UserRoleBadgeProps) {
  const normalizedRole = (role || 'user').toLowerCase();

  if (normalizedRole === 'admin') {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
        Admin
      </span>
    );
  }
  if (normalizedRole === 'user_model') {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
        User Model
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
      User
    </span>
  );
}

interface UserFormModalProps {
  modalMode: 'add' | 'edit';
  formData: UserFormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

function UserFormModal({ modalMode, formData, onInputChange, onSubmit, onClose }: UserFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl border">
        <div className="mb-6 flex items-center justify-between border-b pb-3">
          <h2 className="text-xl font-semibold text-gray-800">
            {modalMode === 'edit' ? 'Edit User Account' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
            aria-label="ปิด Modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              id="user_name"
              name="user_name"
              value={formData.user_name}
              onChange={onInputChange}
              required
              placeholder="e.g. john_doe"
              className="w-full p-2.5 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {modalMode === 'edit' ? 'New Password' : 'Password *'}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={onInputChange}
              required={modalMode === 'add'}
              placeholder={modalMode === 'edit' ? 'Leave blank to keep current' : 'Enter secret password'}
              className="w-full p-2.5 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={onInputChange}
              className="w-full p-2.5 border rounded-md shadow-sm bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="user_model">User Model</option>
            </select>
          </div>

          <div className="md:col-span-3 flex gap-4 pt-3 border-t">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-6 py-2.5 rounded-md shadow-md hover:bg-blue-700 font-semibold transition"
            >
              {modalMode === 'edit' ? 'Update User' : 'Add User'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-6 py-2.5 rounded-md shadow-sm hover:bg-gray-300 font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// =============================================================================
// Main Component
// =============================================================================

export default function UserAdminPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  // States
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<UserFormData>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [, setSearchTerm] = useState('');
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();

  const closeAddModal = () => {
    setShowForm(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/api/users');
      setUsers(data as User[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // รองรับการ Highlight แถวเมื่อกลับมาจากการแก้ไขที่หน้า /admin/users/edit/:id
  useEffect(() => {
    const editedId = searchParams.get('editedId');
    if (editedId) {
      const id = parseInt(editedId, 10);
      if (Number.isFinite(id)) {
        setHighlightedId(id);
        const timer = setTimeout(() => setHighlightedId(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // จัดการบันทึกข้อมูลผู้ใช้ (เพิ่มใหม่หรืออัปเดต)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.user_name.trim()) {
      await showError('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อผู้ใช้');
      return;
    }
    if (modalMode === 'add' && !formData.password.trim()) {
      await showError('ข้อมูลไม่ครบ', 'กรุณากรอกรหัสผ่าน');
      return;
    }

    try {
      if (modalMode === 'edit' && editingId) {
        await apiPut(`/api/users/${editingId}`, {
          user_name: formData.user_name,
          password: formData.password || undefined,
          role: formData.role || null,
        });
        closeAddModal();
        await fetchUsers();
        setHighlightedId(editingId);
        setTimeout(() => setHighlightedId(null), 3000);
        await showSuccess('แก้ไขสำเร็จ', `แก้ไขข้อมูลผู้ใช้ "${formData.user_name.trim()}" เรียบร้อยแล้ว`);
      } else {
        await apiPost('/api/users', {
          user_name: formData.user_name,
          password: formData.password,
          role: formData.role,
        });
        closeAddModal();
        await fetchUsers();
        await showSuccess('บันทึกสำเร็จ', `เพิ่มผู้ใช้ "${formData.user_name.trim()}" เรียบร้อยแล้ว`);
      }
    } catch (err) {
      await showError('เกิดข้อผิดพลาด', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    }
  };

  // จัดการลบผู้ใช้พร้อม Confirm Dialog
  const handleDelete = async (userId: number, userName: string) => {
    const isConfirmed = await confirmAction('ยืนยันการลบผู้ใช้', `ต้องการลบ "${userName}" ใช่หรือไม่?`);
    if (!isConfirmed) {
      return;
    }
    try {
      await apiDelete(`/api/users/${userId}`);
      await fetchUsers();
      await showSuccess('ลบสำเร็จ', `ลบผู้ใช้ "${userName}" เรียบร้อยแล้ว`);
    } catch (err) {
      await showError('เกิดข้อผิดพลาด', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    }
  };

  // Event Delegation สำหรับปุ่ม Edit และ Delete ภายในตาราง DataTables
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
          const userToEdit = users.find((u) => u.user_id === userId);
          if (userToEdit) {
            setFormData({
              user_name: userToEdit.user_name,
              password: '',
              role: userToEdit.role || 'user',
            });
            setEditingId(userId);
            setModalMode('edit');
            setShowForm(true);
          }
        }
        return;
      }

      if (deleteButton) {
        const userId = Number(deleteButton.dataset.userId);
        const userName = deleteButton.dataset.userName || `ID ${userId}`;
        if (Number.isFinite(userId)) {
          void handleDelete(userId, userName);
        }
      }
    };

    tableElement.addEventListener('click', handleTableClick);
    return () => tableElement.removeEventListener('click', handleTableClick);
  }, [users, navigate]);

  const columns = [
    { key: 'user_id', label: 'ID', sortable: true, className: 'w-14' },
    { key: 'user_name', label: 'Username', sortable: true },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (val: unknown) => <UserRoleBadge role={val as string} />,
    },
    {
      key: 'password',
      label: 'Password',
      sortable: false,
      render: () => <span className="text-gray-400 tracking-wider font-mono">••••••••</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: unknown, row: User) => (
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            className="edit-user-btn bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
            data-user-id={row.user_id}
          >
            Edit
          </button>
          <button
            type="button"
            className="delete-user-btn bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-700 transition shadow-sm"
            data-user-id={row.user_id}
            data-user-name={row.user_name}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            aria-label="ย้อนกลับ"
            title="ย้อนกลับ"
            className="h-10 w-10 flex items-center justify-center border rounded-md text-gray-700 hover:bg-gray-50 bg-white shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportUsersToCsv(users)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-emerald-700 font-semibold text-sm transition"
          >
            Export to CSV
          </button>
          <button
            onClick={() => {
              setModalMode('add');
              setEditingId(null);
              setFormData(initialFormState);
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-5 py-2 rounded-md shadow-md hover:bg-blue-700 font-semibold text-sm transition"
          >
            + Add User
          </button>
        </div>
      </div>

      {/* Add / Edit User Modal Sub-Component */}
      {showForm && (
        <UserFormModal
          modalMode={modalMode}
          formData={formData}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onClose={closeAddModal}
        />
      )}

      {/* Table Section Card */}
      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Users</h2>
        </div>
        <div className="p-4 overflow-x-auto">
          {error && <p className="text-red-600 bg-red-50 p-4 mb-4 rounded-md">{error}</p>}
          {loading ? (
            <p className="text-gray-600 text-center py-8">Loading users...</p>
          ) : (
            <Table
              ref={tableRef}
              data={users}
              rowIdKey="user_id"
              highlightedRowId={highlightedId}
              columns={columns}
              pageSize={10}
              pageSizeOptions={[5, 10, 20, 50]}
              searchable={true}
              searchPlaceholder="Search users by name..."
              onSearch={handleSearch}
            />
          )}
        </div>
      </div>
    </div>
  );
}

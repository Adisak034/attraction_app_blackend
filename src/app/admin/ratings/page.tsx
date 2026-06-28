// =============================================================================
// app/admin/ratings/page.tsx
// =============================================================================
// หน้าจัดการคะแนนรีวิว (/admin/ratings)
// แสดง rating ทั้งหมดที่ผู้ใช้ให้กับสถานที่
//
// ความสามารถหลัก:
//   - แสดงตาราง rating ทั้งหมด: สถานที่, ผู้ใช้, Work/Finance/Love (คะแนน/5)
//   - ลบ rating รายการได้ (พร้อม confirm dialog)
//   - Export ข้อมูลทั้งหมดเป็นไฟล์ CSV
//   - Search, sort, pagination ผ่าน Table component
//
// API ที่เรียก:
//   GET    /api/rating      - ดึง rating ทั้งหมด
//   DELETE /api/rating/:id  - ลบ rating
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Table } from '@/components/Table';
import { apiGet, apiDelete } from '@/lib/apiClient';
import { confirmAction, showError, showInfo, showSuccess } from '@/lib/swal';

// Interface based on the database schema
interface Rating {
  rating_id: number;
  user_id: number;
  attraction_id: number;
  rating_work: number;
  rating_finance: number;
  rating_love: number;
  created_at: string;
  user_name: string;
  attraction_name: string;
}

export default function RatingAdminPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportCategory, setExportCategory] = useState<'all' | 'work' | 'finance' | 'love'>('all');

  const escapeCsv = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const handleExportCsv = (category: 'all' | 'work' | 'finance' | 'love' = 'all') => {
    let filteredRatings = ratings;
    let headers: string[] = [];
    let getRow: (r: Rating) => any[] = () => [];
    let fileSuffix = 'all';

    if (category === 'work') {
      filteredRatings = ratings.filter((r) => r.rating_work > 0);
      headers = ['rating_id', 'attraction_id', 'user_id', 'rating'];
      getRow = (r) => [r.rating_id, r.attraction_id, r.user_id, r.rating_work];
      fileSuffix = 'work';
    } else if (category === 'finance') {
      filteredRatings = ratings.filter((r) => r.rating_finance > 0);
      headers = ['rating_id', 'attraction_id', 'user_id', 'rating'];
      getRow = (r) => [r.rating_id, r.attraction_id, r.user_id, r.rating_finance];
      fileSuffix = 'finance';
    } else if (category === 'love') {
      filteredRatings = ratings.filter((r) => r.rating_love > 0);
      headers = ['rating_id', 'attraction_id', 'user_id', 'rating'];
      getRow = (r) => [r.rating_id, r.attraction_id, r.user_id, r.rating_love];
      fileSuffix = 'love';
    } else {
      filteredRatings = ratings;
      headers = ['rating_id', 'attraction_id', 'user_id', 'rating_work', 'rating_finance', 'rating_love'];
      getRow = (r) => [r.rating_id, r.attraction_id, r.user_id, r.rating_work, r.rating_finance, r.rating_love];
      fileSuffix = 'all';
    }

    if (filteredRatings.length === 0) {
      void showInfo('ไม่มีข้อมูล', 'ไม่มีคะแนนรีวิวสำหรับหมวดหมู่ที่เลือก');
      return;
    }

    const rows = filteredRatings.map(getRow);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ratings-${fileSuffix}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const data: Rating[] = await apiGet('/api/rating');
      setRatings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleDelete = async (ratingId: number, userName: string, attractionId: number) => {
    const isConfirmed = await confirmAction(
      'Confirm Delete',
      `Are you sure you want to delete the rating for Attraction ID ${attractionId} by "${userName}"?`
    );
    if (!isConfirmed) {
      return;
    }
    try {
      await apiDelete(`/api/rating/${ratingId}`);
      fetchRatings();
      await showSuccess('Success', `Rating for Attraction ID ${attractionId} by "${userName}" has been deleted successfully!`);
    } catch (err) {
      await showError('Error', err instanceof Error ? err.message : 'Failed to delete the rating');
    }
  };

  const columns = [
    { key: 'rating_id', label: 'ID', sortable: true },
    { key: 'attraction_id', label: 'Attraction ID', sortable: true },
    { key: 'user_name', label: 'User', sortable: true },
    { 
      key: 'rating_work', 
      label: 'Work', 
      sortable: true,
      render: (val: number) => <span className="text-blue-600 font-bold text-lg">{val > 0 ? `${val}/5` : '-'}</span>
    },
    { 
      key: 'rating_finance', 
      label: 'Finance', 
      sortable: true,
      render: (val: number) => <span className="text-green-600 font-bold text-lg">{val > 0 ? `${val}/5` : '-'}</span>
    },
    { 
      key: 'rating_love', 
      label: 'Love', 
      sortable: true,
      render: (val: number) => <span className="text-red-600 font-bold text-lg">{val > 0 ? `${val}/5` : '-'}</span>
    },
    { 
      key: 'created_at', 
      label: 'Date', 
      sortable: true,
      render: (val: string) => new Date(val).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, rating: Rating) => (
        <button
          onClick={() => handleDelete(rating.rating_id, rating.user_name, rating.attraction_id)}
          className="bg-red-600 text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-red-700 transition shadow-sm"
        >
          Delete
        </button>
      )
    }
  ];

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      {/* Header */}
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
          <h1 className="text-3xl font-bold text-gray-900">Rating Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={exportCategory}
            onChange={(e) => setExportCategory(e.target.value as any)}
            aria-label="เลือกหมวดหมู่ที่ต้องการ Export"
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">📊 ทั้งหมด (All Categories)</option>
            <option value="work">💼 การงาน (Work)</option>
            <option value="finance">💰 การเงิน (Finance)</option>
            <option value="love">❤️ ความรัก (Love)</option>
          </select>
          <button
            onClick={() => handleExportCsv(exportCategory)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-emerald-700 font-semibold text-sm whitespace-nowrap"
          >
            Export to CSV
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Ratings</h2>
        </div>
        <div className="overflow-x-auto">
          {error && <p className="text-red-600 bg-red-50 p-4 m-4 rounded-md">{error}</p>}
          {loading && <p className="text-gray-600 text-center py-8">Loading ratings...</p>}
          {!loading && !error && (
            <Table
              ref={tableRef}
              columns={columns}
              data={ratings}
              pageSize={10}
              pageSizeOptions={[5, 10, 20, 50]}
              searchable={true}
              onSearch={handleSearch}
            />
          )}
        </div>
      </div>
    </div>
  );
}

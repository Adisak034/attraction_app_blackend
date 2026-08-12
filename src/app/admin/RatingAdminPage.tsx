// =============================================================================
// app/admin/ratings/page.tsx
// =============================================================================
// หน้าจัดการคะแนนรีวิว (/admin/ratings)
// แสดง rating ทั้งหมดที่ผู้ใช้ให้กับสถานที่
//
// ความสามารถหลัก:
//   - แสดงตาราง rating ทั้งหมด: สถานที่, ผู้ใช้, Work/Finance/Love (คะแนน/5)
//   - ลบ rating รายการได้ (พร้อม confirm dialog)
//   - Export ข้อมูลทั้งหมดหรือแยกตามหมวดหมู่เป็นไฟล์ CSV
//   - Search, sort, pagination ผ่าน Table component
//
// API ที่เรียก:
//   GET    /api/rating      - ดึง rating ทั้งหมด
//   DELETE /api/rating/:id  - ลบ rating
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table } from './components/Table';
import { apiDelete, apiGet } from '@/lib/apiClient';
import { confirmAction, showError, showInfo, showSuccess } from '@/lib/swal';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface Rating {
  rating_id: number;
  user_id: number;
  attraction_id: number;
  rating_work: number;
  rating_finance: number;
  rating_love: number;
  created_at: string;
  user_name: string;
  role?: string;
  attraction_name: string;
}

type ExportCategoryType = 'all' | 'work' | 'finance' | 'love';


// =============================================================================
// Helper Formatting & CSV Export Functions (Single Responsibility)
// =============================================================================

/** แปลงข้อความให้ปลอดภัยสำหรับการส่งออกไฟล์ CSV */
function escapeCsv(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** จัดรูปแบบและส่งออกข้อมูลคะแนนรีวิวเป็นไฟล์ CSV ตามหมวดหมู่ที่เลือก */
function exportRatingsToCsv(ratings: Rating[], category: ExportCategoryType = 'all'): void {
  let filteredRatings = ratings;
  let headers: string[] = [];
  let getRow: (r: Rating) => (string | number)[] = () => [];
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
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ratings-${fileSuffix}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** จัดรูปแบบวันและเวลาสำหรับการแสดงผลในตาราง */
function formatDateTimeCell(val: string): string {
  return new Date(val).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}


// =============================================================================
// Sub-Components (UI Modularization)
// =============================================================================

interface RatingScoreBadgeProps {
  score: number;
  colorClass: string;
}

function RatingScoreBadge({ score, colorClass }: RatingScoreBadgeProps) {
  if (score <= 0) {
    return <span className="text-gray-400 font-medium">-</span>;
  }
  return <span className={`${colorClass} font-bold text-lg`}>{score}/5</span>;
}

interface RatingExportToolbarProps {
  selectedCategory: ExportCategoryType;
  onCategoryChange: (category: ExportCategoryType) => void;
  onExport: () => void;
}

function RatingExportToolbar({ selectedCategory, onCategoryChange, onExport }: RatingExportToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value as ExportCategoryType)}
        aria-label="เลือกหมวดหมู่ที่ต้องการ Export"
        className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
      >
        <option value="all">📊 ทั้งหมด (All Categories)</option>
        <option value="work">💼 การงาน (Work)</option>
        <option value="finance">💰 การเงิน (Finance)</option>
        <option value="love">❤️ ความรัก (Love)</option>
      </select>
      <button
        onClick={onExport}
        className="bg-emerald-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-emerald-700 font-semibold text-sm whitespace-nowrap transition"
      >
        Export to CSV
      </button>
    </div>
  );
}


// =============================================================================
// Main Component
// =============================================================================

export default function RatingAdminPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setSearchTerm] = useState('');
  const [exportCategory, setExportCategory] = useState<ExportCategoryType>('all');

  // ดึงรายการคะแนนรีวิวทั้งหมดจาก API
  const fetchRatings = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/api/rating');
      const allRatings = data as Rating[];
      const filtered = allRatings.filter(
        (r) => r.role?.toLowerCase().replace(/[\s_-]/g, '') !== 'usermodel'
      );
      setRatings(filtered);
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

  // ลบคะแนนรีวิวรายการที่กำหนดพร้อม Confirm Dialog
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
      await fetchRatings();
      await showSuccess('Success', `Rating for Attraction ID ${attractionId} by "${userName}" has been deleted successfully!`);
    } catch (err) {
      await showError('Error', err instanceof Error ? err.message : 'Failed to delete the rating');
    }
  };

  const columns = [
    { key: 'rating_id', label: 'ID', sortable: true, className: 'w-14' },
    { key: 'attraction_id', label: 'Attraction ID', sortable: true, className: 'w-24' },
    { key: 'user_name', label: 'User', sortable: true },
    {
      key: 'rating_work',
      label: 'Work',
      sortable: true,
      render: (val: unknown) => <RatingScoreBadge score={Number(val)} colorClass="text-blue-600" />,
    },
    {
      key: 'rating_finance',
      label: 'Finance',
      sortable: true,
      render: (val: unknown) => <RatingScoreBadge score={Number(val)} colorClass="text-green-600" />,
    },
    {
      key: 'rating_love',
      label: 'Love',
      sortable: true,
      render: (val: unknown) => <RatingScoreBadge score={Number(val)} colorClass="text-red-600" />,
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (val: unknown) => formatDateTimeCell(val as string),
    },
    // {
    //   key: 'actions',
    //   label: 'Actions',
    //   render: (_: unknown, rating: Rating) => (
    //     <button
    //       onClick={() => handleDelete(rating.rating_id, rating.user_name, rating.attraction_id)}
    //       className="bg-gray-600 text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-red-700 transition shadow-sm"
    //     >
    //       Delete
    //     </button>
    //   ),
    // },
  ];

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      {/* Header Bar & Export Toolbar */}
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
          <h1 className="text-3xl font-bold text-gray-900">Rating Management</h1>
        </div>

        <RatingExportToolbar
          selectedCategory={exportCategory}
          onCategoryChange={setExportCategory}
          onExport={() => exportRatingsToCsv(ratings, exportCategory)}
        />
      </div>

      {/* Table Section Card */}
      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Ratings</h2>
        </div>
        <div className="overflow-x-auto p-4">
          {error && <p className="text-red-600 bg-red-50 p-4 mb-4 rounded-md">{error}</p>}
          {loading && <p className="text-gray-600 text-center py-8">Loading ratings...</p>}
          {!loading && !error && (
            <Table
              ref={tableRef}
              columns={columns}
              data={ratings}
              pageSize={10}
              pageSizeOptions={[5, 10, 20, 50]}
              searchable={true}
              searchPlaceholder="Search ratings..."
              onSearch={handleSearch}
            />
          )}
        </div>
      </div>
    </div>
  );
}

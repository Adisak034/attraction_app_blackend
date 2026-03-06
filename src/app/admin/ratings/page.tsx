import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DataTable from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { apiGet, apiDelete } from '@/lib/apiClient';
import { confirmAction, showError, showInfo, showSuccess } from '@/lib/swal';

// Interface based on the database schema
interface Rating {
  rating_id: number;
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
  const dataTableRef = useRef<any>(null);

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const escapeCsv = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const handleExportCsv = () => {
    if (ratings.length === 0) {
      void showInfo('ไม่มีข้อมูล', 'ไม่มีคะแนนสำหรับส่งออก');
      return;
    }

    const headers = [
      'rating_id',
      'attraction_name',
      'user_name',
      'rating_work',
      'rating_finance',
      'rating_love',
      'created_at',
    ];

    const rows = ratings.map((rating) => [
      rating.rating_id,
      rating.attraction_name,
      rating.user_name,
      rating.rating_work,
      rating.rating_finance,
      rating.rating_love,
      rating.created_at,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ratings-${new Date().toISOString().slice(0, 10)}.csv`;
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

  useEffect(() => {
    if (loading) return;
    if (!tableRef.current) return;

    if (dataTableRef.current) {
      dataTableRef.current.destroy();
      dataTableRef.current = null;
    }

    if (ratings.length === 0) return;

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
  }, [loading, ratings]);

  const handleDelete = async (ratingId: number, userName: string, attractionName: string) => {
    const isConfirmed = await confirmAction(
      'ยืนยันการลบคะแนน',
      `ต้องการลบคะแนนของ "${userName}" สำหรับสถานที่ "${attractionName}" ใช่หรือไม่?`
    );
    if (!isConfirmed) {
      return;
    }
    try {
      await apiDelete(`/api/rating/${ratingId}`);
      fetchRatings();
      await showSuccess('ลบสำเร็จ', `ลบคะแนนของ "${userName}" ที่ให้กับ "${attractionName}" เรียบร้อยแล้ว`);
    } catch (err) {
      await showError('เกิดข้อผิดพลาด', err instanceof Error ? err.message : 'ไม่สามารถลบคะแนนได้');
    }
  };

  useEffect(() => {
    const tableElement = tableRef.current;
    if (!tableElement) return;

    const handleTableClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('.delete-rating-btn') as HTMLButtonElement | null;
      if (!button) return;

      const ratingId = Number(button.dataset.ratingId);
      const userName = button.dataset.userName || 'Unknown';
      const attractionName = button.dataset.attractionName || 'Unknown';

      if (!Number.isFinite(ratingId)) return;
      handleDelete(ratingId, userName, attractionName);
    };

    tableElement.addEventListener('click', handleTableClick);
    return () => tableElement.removeEventListener('click', handleTableClick);
  }, [ratings]);

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
        <button
          onClick={handleExportCsv}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-emerald-700 font-semibold"
        >
          Export to CSV
        </button>
      </div>

      {/* Table Section */}
      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Ratings</h2>
        </div>
        <div className="overflow-x-auto">
          {error && <p className="text-red-600 bg-red-50 p-4 m-4 rounded-md">{error}</p>}
          {loading && <p className="text-gray-600 text-center py-8">Loading ratings...</p>}
          <table ref={tableRef} className="w-full display compact hover stripe">
            <thead>
              <tr>
                <th>ID</th>
                <th>Attraction</th>
                <th>User</th>
                <th>Work</th>
                <th>Finance</th>
                <th>Love</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ratings.map((rating) => (
                <tr key={rating.rating_id} data-id={rating.rating_id}>
                  <td>{rating.rating_id}</td>
                  <td>{rating.attraction_name}</td>
                  <td>{rating.user_name}</td>
                  <td><span className="text-blue-600 font-bold text-lg">{rating.rating_work > 0 ? `${rating.rating_work}★` : '-'}</span></td>
                  <td><span className="text-green-600 font-bold text-lg">{rating.rating_finance > 0 ? `${rating.rating_finance}★` : '-'}</span></td>
                  <td><span className="text-red-600 font-bold text-lg">{rating.rating_love > 0 ? `${rating.rating_love}★` : '-'}</span></td>
                  <td>{new Date(rating.created_at).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <button
                      type="button"
                      className="delete-rating-btn bg-red-600 text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-red-700 transition shadow-sm"
                      data-rating-id={rating.rating_id}
                      data-user-name={rating.user_name}
                      data-attraction-name={rating.attraction_name}
                    >
                      Delete
                    </button>
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

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Table } from '@/components/Table';
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

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const escapeCsv = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const handleExportCsv = () => {
    if (ratings.length === 0) {
      void showInfo('à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸à¸¡à¸¹à¸¥', 'à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¸°à¹à¸™à¸™à¸ªà¸³à¸«à¸£à¸±à¸šà¸ªà¹ˆà¸‡à¸à¸à¸');
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
    link.download = `ratings-${new Date().toISOString().split('T')[0]}.csv`;
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

  const handleDelete = async (ratingId: number, userName: string, attractionName: string) => {
    const isConfirmed = await confirmAction(
      'Confirm Delete',
      `Are you sure you want to delete the rating for "${attractionName}" by "${userName}"?`
    );
    if (!isConfirmed) {
      return;
    }
    try {
      await apiDelete(`/api/rating/${ratingId}`);
      fetchRatings();
      await showSuccess('Success', `Rating for "${attractionName}" by "${userName}" has been deleted successfully!`);
    } catch (err) {
      await showError('Error', err instanceof Error ? err.message : 'Failed to delete the rating');
    }
  };

  const columns = [
    { key: 'rating_id', label: 'ID', sortable: true },
    { key: 'attraction_name', label: 'Attraction', sortable: true },
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
          onClick={() => handleDelete(rating.rating_id, rating.user_name, rating.attraction_name)}
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
            aria-label="à¸¢à¹‰à¸à¸™à¸à¸¥à¸±à¸š"
            title="à¸¢à¹‰à¸à¸™à¸à¸¥à¸±à¸š"
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

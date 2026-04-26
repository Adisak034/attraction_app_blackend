import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Table } from '@/components/Table';
import { apiGet } from '@/lib/apiClient';

interface Category {
  category_id: number;
  category_name: string;
}

export default function CategoryAdminPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data: Category[] = await apiGet('/api/category');
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const columns = [
    { key: 'category_id', label: 'ID', sortable: true },
    { key: 'category_name', label: 'Category Name', sortable: true },
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
          <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
        </div>
      </div>

      {/* Table Section */}
      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Categories</h2>
        </div>
        {error && <p className="text-red-500 p-6">{error}</p>}
        {loading && <p className="text-gray-500 p-6">Loading...</p>}
        <div className="overflow-x-auto">
          {!loading && !error && (
            <Table
              ref={tableRef}
              columns={columns}
              data={categories}
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

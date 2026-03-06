import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DataTable from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { apiGet } from '@/lib/apiClient';

interface AttractionWithImage {
  attraction_id: number;
  attraction_name: string;
  attraction_image: string | null;
}

interface Attraction {
  attraction_id: number;
  attraction_name: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const resolveImageUrl = (url: string | null | undefined, cacheBuster?: number) => {
  if (!url) return '';
  const fullUrl = /^https?:\/\//i.test(url) || url.startsWith('data:')
    ? url
    : url.startsWith('/')
      ? `${API_BASE_URL}${url}`
      : `${API_BASE_URL}/${url}`;

  if (!cacheBuster) return fullUrl;
  return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}v=${cacheBuster}`;
};

export default function ImageAdminPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableRef = useRef<any>(null);

  const [images, setImages] = useState<AttractionWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageVersion, setImageVersion] = useState<number>(Date.now());

  const fetchData = async () => {
    try {
      setLoading(true);
      const imageData: Array<{ attraction_id: number; attraction_image: string }> = await apiGet('/api/image');
      const attractionData: Attraction[] = await apiGet('/api/attraction');

      const imageMap = new Map(imageData.map((item) => [item.attraction_id, item.attraction_image]));
      const normalized: AttractionWithImage[] = attractionData.map((item) => ({
        attraction_id: item.attraction_id,
        attraction_name: item.attraction_name,
        attraction_image: imageMap.get(item.attraction_id) || null,
      }));

      setImages(normalized);
      setImageVersion(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!tableRef.current) return;

    if (dataTableRef.current) {
      dataTableRef.current.destroy();
      dataTableRef.current = null;
    }

    if (images.length === 0) return;

    dataTableRef.current = new DataTable(tableRef.current, {
      pageLength: 10,
      lengthMenu: [5, 10, 20, 50],
      searching: true,
      ordering: true,
      paging: true,
      info: true,
      dom: 'lrtip',
    });

    if (searchTerm.trim()) {
      dataTableRef.current.search(searchTerm.trim()).draw();
    }

    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, [loading, images]);

  const handleSearch = () => {
    if (!dataTableRef.current) return;
    dataTableRef.current.search(searchTerm.trim()).draw();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    if (!dataTableRef.current) return;
    dataTableRef.current.search('').draw();
  };

  useEffect(() => {
    const tableElement = tableRef.current;
    if (!tableElement) return;

    const handleTableClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const editButton = target.closest('.edit-image-btn') as HTMLButtonElement | null;

      if (editButton) {
        const attractionId = Number(editButton.dataset.attractionId);
        if (Number.isFinite(attractionId)) {
          navigate(`/admin/images/edit/${attractionId}`);
        }
      }
    };

    tableElement.addEventListener('click', handleTableClick);
    return () => tableElement.removeEventListener('click', handleTableClick);
  }, [images, navigate]);

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
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
          <h1 className="text-3xl font-bold text-gray-900">Image Management</h1>
        </div>
      </div>

      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Images</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search images..."
              className="w-56 p-2 border rounded-md text-sm"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-semibold hover:bg-blue-700"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleClearSearch}
              className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-semibold hover:bg-gray-300"
            >
              Clear
            </button>
          </form>
        </div>
        <div className="overflow-x-auto p-4">
          {error && <p className="text-red-600 bg-red-50 p-4 rounded-md mb-4">{error}</p>}
          {loading && <p className="text-gray-600 text-center py-8">Loading images...</p>}
          <table ref={tableRef} className="w-full display compact hover stripe">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Image Preview</th>
                <th>Image URL</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {images.map((item) => (
                <tr key={item.attraction_id}>
                  <td>{item.attraction_id}</td>
                  <td>{item.attraction_name}</td>
                  <td>
                    {item.attraction_image ? (
                      <img src={resolveImageUrl(item.attraction_image, imageVersion)} alt="preview" className="w-[100px] h-[80px] object-cover rounded border border-gray-200" />
                    ) : (
                      <span className="text-gray-400">No image</span>
                    )}
                  </td>
                  <td>
                    {item.attraction_image ? (
                      <a href={resolveImageUrl(item.attraction_image, imageVersion)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
                        {item.attraction_image.length > 40 ? `${item.attraction_image.slice(0, 40)}...` : item.attraction_image}
                      </a>
                    ) : (
                      <span className="text-gray-400">No URL</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button type="button" className="edit-image-btn bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition shadow-sm" data-attraction-id={item.attraction_id}>Edit</button>
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

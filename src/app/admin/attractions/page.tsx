import { useState, useEffect, FormEvent, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DataTable from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { apiGet, apiPost, apiDelete } from '@/lib/apiClient';

// Interfaces based on the database schema
interface Attraction {
  attraction_id: number;
  attraction_name: string;
  type_id: number | null;
  district_id: number | null;
  sect_id: number | null;
  lat: number | null;
  lng: number | null;
  sacred_obj: string | null;
  offering: string | null;
  attraction_image: string | null;
  categories: string; // This comes from the GROUP_CONCAT in the GET API
}

interface Category {
  category_id: number;
  category_name: string;
}

interface Type {
    type_id: number;
    type_name: string;
}

interface District {
    district_id: number;
    district_name: string;
}

interface Sect {
    sect_id: number;
    sect_name: string;
}

const initialFormState = {
  attraction_name: '',
  type_id: '',
  district_id: '',
  sect_id: '',
  lat: '',
  lng: '',
  sacred_obj: '',
  offering: '',
  category_ids: [] as number[],
};

export default function AttractionAdminPage() {
  // Data states
  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableRef = useRef<any>(null);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [sects, setSects] = useState<Sect[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form and UI states
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const closeAddModal = () => {
    setShowForm(false);
    setFormData(initialFormState);
  };

  // Fetch all necessary data for the page
  const fetchData = async () => {
    try {
      setLoading(true);
      const attractionsData = await apiGet('/api/attraction');
      const categoriesData = await apiGet('/api/category');
      const typesData = await apiGet('/api/type');
      const districtsData = await apiGet('/api/district');
      const sectsData = await apiGet('/api/sect');

      setAttractions(attractionsData);
      setCategories(categoriesData);
      setTypes(typesData);
      setDistricts(districtsData);
      setSects(sectsData);
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

    if (attractions.length === 0) return;

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
  }, [loading, attractions]);

  const formatCoordinate = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '-';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? String(value) : '-';
  };

  const typeNameMap = new Map(types.map((item) => [item.type_id, item.type_name]));
  const districtNameMap = new Map(districts.map((item) => [item.district_id, item.district_name]));
  const sectNameMap = new Map(sects.map((item) => [item.sect_id, item.sect_name]));

  const getLookupName = (
    id: number | string | null | undefined,
    lookupMap: Map<number, string>
  ) => {
    if (id === null || id === undefined || id === '') return '-';
    const parsedId = Number(id);
    if (!Number.isFinite(parsedId)) return '-';
    return lookupMap.get(parsedId) || String(id);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle category checkbox changes
  const handleCategoryChange = (categoryId: number) => {
    setFormData(prev => {
        const newCategoryIds = prev.category_ids.includes(categoryId)
            ? prev.category_ids.filter(id => id !== categoryId)
            : [...prev.category_ids, categoryId];
        return { ...prev, category_ids: newCategoryIds };
    });
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.attraction_name.trim()) {
        alert('Attraction Name is required.');
        return;
    }
    try {
      await apiPost('/api/attraction', {
        ...formData,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        type_id: formData.type_id ? parseInt(formData.type_id, 10) : null,
        district_id: formData.district_id ? parseInt(formData.district_id, 10) : null,
        sect_id: formData.sect_id ? parseInt(formData.sect_id, 10) : null,
      });

      closeAddModal();
      await fetchData();
      navigate('/admin/attractions', { replace: true });
      alert('Attraction created successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  // Handle delete action
  const handleDelete = async (attractionId: number) => {
    if (!confirm('Are you sure you want to delete this attraction? This action cannot be undone.')) {
      return;
    }
    try {
      await apiDelete(`/api/attraction/${attractionId}`);
      fetchData(); // Refresh data
      alert('Attraction deleted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  useEffect(() => {
    const tableElement = tableRef.current;
    if (!tableElement) return;

    const handleTableClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const editButton = target.closest('.edit-attraction-btn') as HTMLButtonElement | null;
      const deleteButton = target.closest('.delete-attraction-btn') as HTMLButtonElement | null;

      if (editButton) {
        const attractionId = Number(editButton.dataset.attractionId);
        if (Number.isFinite(attractionId)) {
          navigate(`/admin/attractions/edit/${attractionId}`);
        }
        return;
      }

      if (deleteButton) {
        const attractionId = Number(deleteButton.dataset.attractionId);
        if (Number.isFinite(attractionId)) {
          handleDelete(attractionId);
        }
      }
    };

    tableElement.addEventListener('click', handleTableClick);
    return () => tableElement.removeEventListener('click', handleTableClick);
  }, [attractions, navigate]);

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
          <h1 className="text-3xl font-bold text-gray-900">Attraction Management</h1>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setFormData(initialFormState);
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-md shadow-md hover:bg-blue-700 font-semibold"
        >
          + Add Attraction
        </button>
      </div>

      {/* Add Attraction Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-6xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Add New Attraction</h2>
              <button onClick={closeAddModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Main Details */}
            <div className="md:col-span-2 lg:col-span-3">
              <label htmlFor="attraction_name" className="block text-sm font-medium text-gray-700 mb-1">Attraction Name *</label>
              <input type="text" id="attraction_name" name="attraction_name" value={formData.attraction_name} onChange={handleInputChange} required className="w-full p-2 border rounded-md shadow-sm" />
            </div>
            
            {/* Dropdowns */}
            <div>
              <label htmlFor="type_id" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select id="type_id" name="type_id" value={formData.type_id} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm">
                <option value="">Select Type</option>
                {types.map(t => <option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="district_id" className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <select id="district_id" name="district_id" value={formData.district_id} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm">
                <option value="">Select District</option>
                {districts.map(d => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sect_id" className="block text-sm font-medium text-gray-700 mb-1">Sect</label>
              <select id="sect_id" name="sect_id" value={formData.sect_id} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm">
                <option value="">Select Sect</option>
                {sects.map(s => <option key={s.sect_id} value={s.sect_id}>{s.sect_name}</option>)}
              </select>
            </div>

            {/* Coordinates */}
            <div>
              <label htmlFor="lat" className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input type="number" step="any" id="lat" name="lat" value={formData.lat} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm" />
            </div>
            <div>
              <label htmlFor="lng" className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input type="number" step="any" id="lng" name="lng" value={formData.lng} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm" />
            </div>

            {/* Text Areas */}
            <div className="md:col-span-2 lg:col-span-3">
              <label htmlFor="sacred_obj" className="block text-sm font-medium text-gray-700 mb-1">Sacred Objects</label>
              <textarea id="sacred_obj" name="sacred_obj" value={formData.sacred_obj} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md shadow-sm" />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label htmlFor="offering" className="block text-sm font-medium text-gray-700 mb-1">Offerings</label>
              <textarea id="offering" name="offering" value={formData.offering} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md shadow-sm" />
            </div>

            {/* Categories Checkboxes */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-4 border rounded-md max-h-48 overflow-y-auto bg-gray-50">
                {categories.map(cat => (
                  <label key={cat.category_id} className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={formData.category_ids.includes(cat.category_id)} onChange={() => handleCategoryChange(cat.category_id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">{cat.category_name}</span>
                  </label>
                ))}
              </div>
            </div>

              {/* Submit Button */}
              <div className="md:col-span-2 lg:col-span-3 flex gap-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold">
                  Add Attraction
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
          <h2 className="text-xl font-semibold text-gray-800">Attractions</h2>
        </div>
        {error && <p className="text-red-500 mb-4 p-6">{error}</p>}
        {loading && <p className="text-gray-500 p-6">Loading...</p>}
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full display compact hover stripe">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>District</th>
                <th>Sect</th>
                <th>Lat</th>
                <th>Lng</th>
                <th>Sacred Objects</th>
                <th>Offering</th>
                <th>Categories</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attractions.map((attr) => (
                <tr key={attr.attraction_id} data-id={attr.attraction_id}>
                  <td>{attr.attraction_id}</td>
                  <td>{attr.attraction_name}</td>
                  <td>{getLookupName(attr.type_id as number | string | null | undefined, typeNameMap)}</td>
                  <td>{getLookupName(attr.district_id as number | string | null | undefined, districtNameMap)}</td>
                  <td>{getLookupName(attr.sect_id as number | string | null | undefined, sectNameMap)}</td>
                  <td>{formatCoordinate(attr.lat as number | string | null | undefined)}</td>
                  <td>{formatCoordinate(attr.lng as number | string | null | undefined)}</td>
                  <td title={String(attr.sacred_obj || '')}>{attr.sacred_obj ? String(attr.sacred_obj).substring(0, 30) + (String(attr.sacred_obj).length > 30 ? '...' : '') : '-'}</td>
                  <td title={String(attr.offering || '')}>{attr.offering ? String(attr.offering).substring(0, 30) + (String(attr.offering).length > 30 ? '...' : '') : '-'}</td>
                  <td>{attr.categories || '-'}</td>
                  <td>
                    <div className="flex gap-2 justify-center">
                      <button type="button" className="edit-attraction-btn bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition shadow-sm" data-attraction-id={attr.attraction_id}>Edit</button>
                      <button type="button" className="delete-attraction-btn bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-700 transition shadow-sm" data-attraction-id={attr.attraction_id}>Delete</button>
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

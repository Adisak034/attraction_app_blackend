import { useState, useEffect, FormEvent, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DataTable from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { apiGet, apiPost, apiDelete, apiUploadFile } from '@/lib/apiClient';

interface AttractionWithImage {
  attraction_id: number;
  attraction_name: string;
  attraction_image: string;
}

interface Attraction {
  attraction_id: number;
  attraction_name: string;
}

const initialFormState = {
  attraction_image: '',
  attraction_id: '',
};

export default function ImageAdminPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);
  const dataTableRef = useRef<any>(null);

  const [images, setImages] = useState<AttractionWithImage[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const imageData: Array<{ attraction_id: number; attraction_image: string }> = await apiGet('/api/image');
      const attractionData: Attraction[] = await apiGet('/api/attraction');

      const nameMap = new Map(attractionData.map((item) => [item.attraction_id, item.attraction_name]));
      const normalized: AttractionWithImage[] = imageData.map((item) => ({
        attraction_id: item.attraction_id,
        attraction_name: nameMap.get(item.attraction_id) || `Attraction #${item.attraction_id}`,
        attraction_image: item.attraction_image,
      }));

      setImages(normalized);
      setAttractions(attractionData);

      if (attractionData.length > 0 && !formData.attraction_id) {
        setFormData((prev) => ({ ...prev, attraction_id: String(attractionData[0].attraction_id) }));
      }
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

    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, [loading, images]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.attraction_id) {
      alert('Attraction is required.');
      return;
    }

    if (!selectedFile && !formData.attraction_image.trim()) {
      alert('Please upload a file or provide an image URL.');
      return;
    }

    try {
      setUploading(true);
      let imageUrl = formData.attraction_image;

      if (selectedFile) {
        const uploadResult = await apiUploadFile('/api/image/upload', selectedFile);
        imageUrl = uploadResult.image_url;
      }

      await apiPost('/api/image', {
        Image_name: imageUrl,
        attraction_id: parseInt(formData.attraction_id, 10),
      });

      setFormData(initialFormState);
      setSelectedFile(null);
      setFilePreview(null);
      fetchData();
      alert('Image added successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attractionId: number, attractionName: string) => {
    if (!confirm(`Delete image for "${attractionName}"?`)) {
      return;
    }

    try {
      await apiDelete(`/api/image/${attractionId}`);
      fetchData();
      alert('Image deleted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting image');
    }
  };

  useEffect(() => {
    const tableElement = tableRef.current;
    if (!tableElement) return;

    const handleTableClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const editButton = target.closest('.edit-image-btn') as HTMLButtonElement | null;
      const deleteButton = target.closest('.delete-image-btn') as HTMLButtonElement | null;

      if (editButton) {
        const attractionId = Number(editButton.dataset.attractionId);
        if (Number.isFinite(attractionId)) {
          navigate(`/admin/images/edit/${attractionId}`);
        }
        return;
      }

      if (deleteButton) {
        const attractionId = Number(deleteButton.dataset.attractionId);
        const attractionName = deleteButton.dataset.attractionName || 'Unknown';
        if (Number.isFinite(attractionId)) {
          handleDelete(attractionId, attractionName);
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
        <button
          onClick={() => {
            setShowForm(!showForm);
            setFormData(initialFormState);
            setSelectedFile(null);
            setFilePreview(null);
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-md shadow-md hover:bg-blue-700 font-semibold"
        >
          + Add Image
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Add New Image</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="attraction_id" className="block text-sm font-medium text-gray-700 mb-1">Attraction *</label>
              <select
                id="attraction_id"
                name="attraction_id"
                value={formData.attraction_id}
                onChange={handleInputChange}
                required
                className="w-full p-2 border rounded-md shadow-sm"
              >
                <option value="" disabled>Select Attraction</option>
                {attractions.map((att) => (
                  <option key={att.attraction_id} value={att.attraction_id}>{att.attraction_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">Upload Image</label>
                <input
                  type="file"
                  id="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="w-full p-2 border rounded-md shadow-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Max size: 5MB. Formats: JPG, PNG, GIF, etc.</p>
              </div>

              <div>
                <label htmlFor="attraction_image" className="block text-sm font-medium text-gray-700 mb-1">Or Image URL</label>
                <input
                  type="text"
                  id="attraction_image"
                  name="attraction_image"
                  value={formData.attraction_image}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                  disabled={uploading}
                  className="w-full p-2 border rounded-md shadow-sm"
                />
              </div>
            </div>

            {filePreview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <img src={filePreview} alt="Preview" className="max-w-xs h-auto rounded border" />
              </div>
            )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Add Image'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-300 text-gray-800 px-6 py-3 rounded-md shadow-md hover:bg-gray-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Images</h2>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((item) => (
                <tr key={item.attraction_id}>
                  <td>{item.attraction_id}</td>
                  <td>{item.attraction_name}</td>
                  <td>
                    {item.attraction_image ? (
                      <img src={item.attraction_image} alt="preview" className="w-[100px] h-[80px] object-cover rounded border border-gray-200" />
                    ) : (
                      <span className="text-gray-400">No image</span>
                    )}
                  </td>
                  <td>
                    {item.attraction_image ? (
                      <a href={item.attraction_image} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
                        {item.attraction_image.length > 40 ? `${item.attraction_image.slice(0, 40)}...` : item.attraction_image}
                      </a>
                    ) : (
                      <span className="text-gray-400">No URL</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button type="button" className="edit-image-btn bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition shadow-sm" data-attraction-id={item.attraction_id}>Edit</button>
                      <button type="button" className="delete-image-btn bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-700 transition shadow-sm" data-attraction-id={item.attraction_id} data-attraction-name={item.attraction_name}>Delete</button>
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

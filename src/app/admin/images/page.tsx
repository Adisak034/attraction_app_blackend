// =============================================================================
// app/admin/images/page.tsx
// =============================================================================
// หน้าจัดการรูปภาพสถานที่ (/admin/images)
// แสดงรายการสถานที่ทั้งหมด พร้อมรูปภาพปัจจุบันของแต่ละสถานที่
//
// ความสามารถหลัก:
//   - รวมข้อมูลจาก /api/image และ /api/attraction เพื่อแสดงรายการสมบูรณ์
//   - Preview รูปภาพขนาดเล็กในตาราง (100x80px)
//   - แสดง URL รูปภาพปัจจุบัน (truncated)
//   - คลิก Edit → ไปหน้า /admin/images/edit/:id
//   - ใช้ cache buster (?v=timestamp) เพื่อให้รูปอัปเดตหลัง edit
//   - highlight แถวที่เพิ่ง edit ด้วยสีเหลือง 3 วินาที
//
// API ที่เรียก:
//   GET /api/image      - ดึง image URL ของสถานที่ทั้งหมด
//   GET /api/attraction - ดึงรายชื่อสถานที่ทั้งหมด
// =============================================================================

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Table } from '@/components/Table';
import { apiGet, apiPut, apiDelete, apiUploadFile } from '@/lib/apiClient';
import { confirmAction, showError, showSuccess } from '@/lib/swal';

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

const IMAGE_FALLBACK_SRC =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial, sans-serif" font-size="24">Image not found</text></svg>';

export default function ImageAdminPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [images, setImages] = useState<AttractionWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageVersion, setImageVersion] = useState<number>(Date.now());
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();

  const [showModal, setShowModal] = useState(false);
  const [editingAttractionId, setEditingAttractionId] = useState<number | null>(null);
  const [editingAttractionName, setEditingAttractionName] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
    const editedId = searchParams.get('editedId');
    if (editedId) {
      const id = parseInt(editedId, 10);
      if (Number.isFinite(id)) {
        setHighlightedId(id);
        // Clear the highlight after 3 seconds
        const timer = setTimeout(() => setHighlightedId(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
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

  const handleSubmitModal = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingAttractionId) return;

    if (!imageUrlInput.trim() && !selectedFile) {
      await showError('ข้อมูลไม่ครบ', 'กรุณาใส่ URL รูปภาพหรืออัปโหลดไฟล์');
      return;
    }

    try {
      setUploading(true);
      let finalUrl = imageUrlInput;

      if (selectedFile) {
        const uploadResult = await apiUploadFile('/api/image/upload', selectedFile, {
          attraction_id: String(editingAttractionId),
        });
        finalUrl = uploadResult.image_url;
      }

      await apiPut(`/api/image/${editingAttractionId}`, {
        Image_name: finalUrl,
        attraction_id: editingAttractionId,
      });

      setShowModal(false);
      await fetchData();
      setHighlightedId(editingAttractionId);
      setTimeout(() => setHighlightedId(null), 3000);
      await showSuccess('บันทึกสำเร็จ', `อัปเดตรูปภาพของ "${editingAttractionName}" เรียบร้อยแล้ว`);
    } catch (err) {
      await showError('เกิดข้อผิดพลาด', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteModal = async () => {
    if (!editingAttractionId) return;
    const isConfirmed = await confirmAction('ยืนยันการลบรูปภาพ', `ต้องการลบรูปภาพของ "${editingAttractionName}" ใช่หรือไม่?`);
    if (!isConfirmed) return;

    try {
      setUploading(true);
      await apiDelete(`/api/image/${editingAttractionId}`);
      setShowModal(false);
      await fetchData();
      await showSuccess('ลบสำเร็จ', `ลบรูปภาพของ "${editingAttractionName}" เรียบร้อยแล้ว`);
    } catch (err) {
      await showError('เกิดข้อผิดพลาด', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    } finally {
      setUploading(false);
    }
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
          const targetRow = images.find((img) => img.attraction_id === attractionId);
          setEditingAttractionId(attractionId);
          setEditingAttractionName(targetRow?.attraction_name || `ID ${attractionId}`);
          setImageUrlInput(targetRow?.attraction_image || '');
          setSelectedFile(null);
          setFilePreview(null);
          setShowModal(true);
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

      {/* Add/Edit Image Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Update Image</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmitModal} className="space-y-6">
              <div>
                <label htmlFor="attraction_id_select" className="block text-sm font-medium text-gray-700 mb-1">Attraction</label>
                <select
                  id="attraction_id_select"
                  value={editingAttractionId || ''}
                  disabled={true}
                  className="w-full p-2 border rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                >
                  {images.map((img) => (
                    <option key={img.attraction_id} value={img.attraction_id}>{img.attraction_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="file_upload" className="block text-sm font-medium text-gray-700 mb-1">Upload New Image</label>
                  <input
                    type="file"
                    id="file_upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="w-full p-2 border rounded-md shadow-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max size: 5MB. Formats: JPG, PNG, GIF, etc.</p>
                </div>

                <div>
                  <label htmlFor="image_url_input" className="block text-sm font-medium text-gray-700 mb-1">Or Image URL</label>
                  <input
                    type="text"
                    id="image_url_input"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    disabled={uploading}
                    className="w-full p-2 border rounded-md shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <img
                  src={filePreview || resolveImageUrl(imageUrlInput, imageVersion)}
                  alt="Preview"
                  className="max-w-full h-auto max-h-64 rounded border"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = IMAGE_FALLBACK_SRC;
                    e.currentTarget.alt = 'Image not found';
                  }}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 font-semibold disabled:bg-gray-400"
                >
                  {uploading ? 'Uploading...' : 'Save Image'}
                </button>
                {imageUrlInput && (
                  <button
                    type="button"
                    onClick={handleDeleteModal}
                    disabled={uploading}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-red-700 font-semibold disabled:bg-gray-300"
                  >
                    Delete Image
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={uploading}
                  className="flex-1 bg-gray-300 text-gray-800 px-6 py-3 rounded-md shadow-md hover:bg-gray-400 font-semibold disabled:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Images</h2>
        </div>
        <div className="overflow-hidden">
          {error && <p className="text-red-600 bg-red-50 p-4 rounded-m m-4 mb-4">{error}</p>}
          {loading ? (
            <p className="text-gray-600 text-center py-8">Loading images...</p>
          ) : (
            <Table
              ref={tableRef}
              data={images}
              rowIdKey="attraction_id"
              highlightedRowId={highlightedId}
              columns={[
                { key: 'attraction_id', label: 'ID', sortable: true },
                { key: 'attraction_name', label: 'Name', sortable: true },
                {
                  key: 'attraction_image',
                  label: 'Image Preview',
                  render: (value: string | null) =>
                    value ? (
                      <img
                        src={resolveImageUrl(value, imageVersion)}
                        alt="preview"
                        className="w-[100px] h-[80px] object-cover rounded border border-gray-200"
                      />
                    ) : (
                      <span className="text-gray-400">No image</span>
                    ),
                },
                {
                  key: 'attraction_image_url',
                  label: 'Image URL',
                  render: (_, row: AttractionWithImage) =>
                    row.attraction_image ? (
                      <a
                        href={resolveImageUrl(row.attraction_image, imageVersion)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                      >
                        {row.attraction_image.length > 40 ? `${row.attraction_image.slice(0, 40)}...` : row.attraction_image}
                      </a>
                    ) : (
                      <span className="text-gray-400">No URL</span>
                    ),
                },
                {
                  key: 'action',
                  label: 'Action',
                  render: (_, row: AttractionWithImage) => (
                    <button
                      type="button"
                      className="edit-image-btn bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
                      data-attraction-id={row.attraction_id}
                    >
                      Edit
                    </button>
                  ),
                },
              ]}
              pageSize={10}
              pageSizeOptions={[5, 10, 20, 50]}
              searchable={true}
              searchPlaceholder="Search images..."
              onSearch={handleSearch}
            />
          )}
        </div>
      </div>
    </div>
  );
}

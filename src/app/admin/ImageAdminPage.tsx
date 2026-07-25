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
//   - คลิก Edit เพื่อเปิด Modal อัปโหลดไฟล์ใหม่ หรือระบุ URL
//   - ใช้ cache buster (?v=timestamp) เพื่อให้รูปอัปเดตทันทีหลังแก้ไข
//   - highlight แถวที่เพิ่ง edit ด้วยสีเหลือง 3 วินาที
// =============================================================================

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table } from './components/Table';
import { apiDelete, apiGet, apiPut, apiUploadFile } from '@/lib/apiClient';
import { confirmAction, showError, showSuccess } from '@/lib/swal';

// =============================================================================
// Types & Interfaces
// =============================================================================

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

const IMAGE_FALLBACK_SRC =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial, sans-serif" font-size="24">Image not found</text></svg>';


// =============================================================================
// Helper Formatting & URL Functions (Single Responsibility)
// =============================================================================

/** คำนวณและแปลง URL รูปภาพให้เป็น Absolute URL พร้อม Cache Buster */
function resolveAttractionImageUrl(url: string | null | undefined, cacheBuster?: number): string {
  if (!url) return '';
  const fullUrl =
    /^https?:\/\//i.test(url) || url.startsWith('data:')
      ? url
      : url.startsWith('/')
        ? `${API_BASE_URL}${url}`
        : `${API_BASE_URL}/${url}`;

  if (!cacheBuster) return fullUrl;
  return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}v=${cacheBuster}`;
}

/** ตัดข้อความ URL ที่ยาวเกินกำหนดเพื่อไม่ให้ตารางกว้างเกินไป */
function truncateUrlText(url: string, maxLen = 40): string {
  return url.length > maxLen ? `${url.slice(0, maxLen)}...` : url;
}


// =============================================================================
// Sub-Components (UI Modularization)
// =============================================================================

interface ImageThumbnailCellProps {
  imageUrl: string | null;
  cacheVersion: number;
}

function ImageThumbnailCell({ imageUrl, cacheVersion }: ImageThumbnailCellProps) {
  if (!imageUrl) {
    return <span className="text-gray-400">No image</span>;
  }

  return (
    <img
      src={resolveAttractionImageUrl(imageUrl, cacheVersion)}
      alt="preview"
      className="w-[100px] h-[80px] object-cover rounded border border-gray-200 shadow-sm"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = IMAGE_FALLBACK_SRC;
        e.currentTarget.alt = 'Image not found';
      }}
    />
  );
}

interface UpdateImageModalProps {
  attractionId: number | null;
  attractionName: string;
  imageUrlInput: string;
  filePreview: string | null;
  cacheVersion: number;
  uploading: boolean;
  onUrlChange: (url: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent) => void;
  onDelete: () => void;
  onClose: () => void;
}

function UpdateImageModal({
  attractionId,
  attractionName,
  imageUrlInput,
  filePreview,
  cacheVersion,
  uploading,
  onUrlChange,
  onFileChange,
  onSubmit,
  onDelete,
  onClose,
}: UpdateImageModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-xl font-semibold text-gray-800">Update Image</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-lg">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attraction</label>
            <div className="w-full p-2.5 border rounded-md shadow-sm bg-gray-100 font-semibold text-gray-800">
              #{attractionId} - {attractionName}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="file_upload" className="block text-sm font-medium text-gray-700 mb-1">
                Upload New Image
              </label>
              <input
                type="file"
                id="file_upload"
                accept="image/*"
                onChange={onFileChange}
                disabled={uploading}
                className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Max size: 5MB. Formats: JPG, PNG, WEBP</p>
            </div>

            <div>
              <label htmlFor="image_url_input" className="block text-sm font-medium text-gray-700 mb-1">
                Or Image URL
              </label>
              <input
                type="text"
                id="image_url_input"
                value={imageUrlInput}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={uploading}
                className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div className="flex justify-center bg-gray-50 p-4 border rounded-md">
              <img
                src={filePreview || resolveAttractionImageUrl(imageUrlInput, cacheVersion)}
                alt="Preview"
                className="max-w-full h-auto max-h-64 rounded border shadow-sm object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = IMAGE_FALLBACK_SRC;
                  e.currentTarget.alt = 'Image not found';
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 font-semibold disabled:bg-gray-400 transition"
            >
              {uploading ? 'Uploading...' : 'Save Image'}
            </button>
            {imageUrlInput && (
              <button
                type="button"
                onClick={onDelete}
                disabled={uploading}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-red-700 font-semibold disabled:bg-gray-300 transition"
              >
                Delete Image
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 bg-gray-300 text-gray-800 px-6 py-3 rounded-md shadow-md hover:bg-gray-400 font-semibold disabled:bg-gray-300 transition"
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

export default function ImageAdminPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableRef = useRef<HTMLTableElement>(null);

  // Data states
  const [images, setImages] = useState<AttractionWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setSearchTerm] = useState('');
  const [imageVersion, setImageVersion] = useState<number>(Date.now());
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  // Modal and form states
  const [showModal, setShowModal] = useState(false);
  const [editingAttractionId, setEditingAttractionId] = useState<number | null>(null);
  const [editingAttractionName, setEditingAttractionName] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ดึงข้อมูลรายการสถานที่และรูปภาพทั้งหมดเพื่อรวมกัน
  const fetchData = async () => {
    try {
      setLoading(true);
      const [imageData, attractionData] = await Promise.all([
        apiGet('/api/image'),
        apiGet('/api/attraction'),
      ]);

      const imageMap = new Map(
        (imageData as Array<{ attraction_id: number; attraction_image: string }>).map((item) => [
          item.attraction_id,
          item.attraction_image,
        ])
      );

      const normalized: AttractionWithImage[] = (attractionData as Attraction[]).map((item) => ({
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

  // Highlight แถวที่เพิ่งอัปเดตรูปภาพ
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

  // บันทึกการเปลี่ยนแปลงรูปภาพ (อัปโหลดไฟล์ หรือบันทึก URL)
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
        finalUrl = (uploadResult as { image_url: string }).image_url;
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

  // ลบรูปภาพปัจจุบันออกจากสถานที่
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

  // ดักฟัง Event Delegation สำหรับคลิกปุ่ม Edit รูปภาพในตาราง
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

  const columns = [
    { key: 'attraction_id', label: 'ID', sortable: true, className: 'w-16' },
    { key: 'attraction_name', label: 'Name', sortable: true },
    {
      key: 'attraction_image',
      label: 'Image Preview',
      render: (value: unknown) => (
        <ImageThumbnailCell imageUrl={value as string | null} cacheVersion={imageVersion} />
      ),
    },
    {
      key: 'attraction_image_url',
      label: 'Image URL',
      render: (_: unknown, row: AttractionWithImage) =>
        row.attraction_image ? (
          <a
            href={resolveAttractionImageUrl(row.attraction_image, imageVersion)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-mono"
          >
            {truncateUrlText(row.attraction_image, 40)}
          </a>
        ) : (
          <span className="text-gray-400">No URL</span>
        ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (_: unknown, row: AttractionWithImage) => (
        <button
          type="button"
          className="edit-image-btn bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
          data-attraction-id={row.attraction_id}
        >
          Edit
        </button>
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
          <h1 className="text-3xl font-bold text-gray-900">Image Management</h1>
        </div>
      </div>

      {/* Update Image Modal Sub-Component */}
      {showModal && (
        <UpdateImageModal
          attractionId={editingAttractionId}
          attractionName={editingAttractionName}
          imageUrlInput={imageUrlInput}
          filePreview={filePreview}
          cacheVersion={imageVersion}
          uploading={uploading}
          onUrlChange={setImageUrlInput}
          onFileChange={handleFileChange}
          onSubmit={handleSubmitModal}
          onDelete={handleDeleteModal}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Table Section Card */}
      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Images</h2>
        </div>
        <div className="overflow-hidden p-4">
          {error && <p className="text-red-600 bg-red-50 p-4 rounded-md mb-4">{error}</p>}
          {loading ? (
            <p className="text-gray-600 text-center py-8">Loading images...</p>
          ) : (
            <Table
              ref={tableRef}
              data={images}
              rowIdKey="attraction_id"
              highlightedRowId={highlightedId}
              columns={columns}
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

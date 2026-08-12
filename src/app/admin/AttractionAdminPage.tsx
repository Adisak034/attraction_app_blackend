// =============================================================================
// app/admin/attractions/page.tsx
// =============================================================================
// หน้าจัดการสถานที่ทั้งหมด (/admin/attractions)
// ใช้สำหรับดู, เพิ่ม, และลบสถานที่ศักดิ์สิทธิ์
//
// ความสามารถหลัก:
//   - แสดงตารางสถานที่ทั้งหมด (พร้อม search, sort, pagination)
//   - เพิ่มสถานที่ใหม่ผ่าน Modal Form (ชื่อ, ประเภท, อำเภอ, นิกาย, พิกัด, ของไหว้, หมวดหมู่)
//   - ลบสถานที่ (พร้อม confirm dialog)
//   - คลิก Edit → ไปหน้า /admin/attractions/edit/:id หรือเปิด Modal Form
//   - หลัง edit จะ highlight แถวที่แก้ไขด้วยสีเหลือง 3 วินาที
// =============================================================================

import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table } from './components/Table';
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';
import { showError, showSuccess } from '@/lib/swal';

// =============================================================================
// Types & Interfaces
// =============================================================================

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
  categories: string; // From GROUP_CONCAT in GET API or raw string
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

interface AttractionFormState {
  attraction_name: string;
  type_id: string;
  district_id: string;
  sect_id: string;
  lat: string;
  lng: string;
  sacred_obj: string;
  offering: string;
  category_ids: number[];
}

const initialFormState: AttractionFormState = {
  attraction_name: '',
  type_id: '',
  district_id: '',
  sect_id: '',
  lat: '',
  lng: '',
  sacred_obj: '',
  offering: '',
  category_ids: [],
};


// =============================================================================
// Helper Formatting Functions
// =============================================================================

/** จัดรูปแบบตัวเลขพิกัด Lat/Lng หรือแสดง '-' หากไม่มีข้อมูล */
function formatCoordinateCell(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(value) : '-';
}

/** ตัดข้อความที่ยาวเกินกำหนดและใส่ '...' พร้อม Tooltip แสดงข้อความเต็ม */
function formatTextSnippet(value: string | null | undefined, maxLen = 30): React.ReactNode {
  if (!value || value === 'null' || (typeof value === 'string' && value.trim() === '')) return '-';
  const textStr = String(value);
  const truncated = textStr.length > maxLen ? `${textStr.substring(0, maxLen)}...` : textStr;
  return (
    <span title={textStr}>
      {truncated}
    </span>
  );
}

/** ค้นหาชื่อเต็มจากรหัส ID ตาม Map ที่กำหนด */
function getLookupTitle(
  id: number | string | null | undefined,
  lookupMap: Map<number, string>
): string {
  if (id === null || id === undefined || id === '') return '-';
  const parsedId = Number(id);
  if (!Number.isFinite(parsedId)) return '-';
  return lookupMap.get(parsedId) || '-';
}


// =============================================================================
// Sub-Components (Modular UI Form)
// =============================================================================

interface AttractionFormModalProps {
  modalMode: 'add' | 'edit';
  formData: AttractionFormState;
  types: Type[];
  districts: District[];
  sects: Sect[];
  categories: Category[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onCategoryChange: (categoryId: number) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

function AttractionFormModal({
  modalMode,
  formData,
  types,
  districts,
  sects,
  categories,
  onInputChange,
  onCategoryChange,
  onSubmit,
  onClose,
}: AttractionFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-6xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {modalMode === 'edit' ? 'Edit Attraction' : 'Add New Attraction'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-lg">
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="attraction_name" className="block text-sm font-medium text-gray-700 mb-1">
              Attraction Name *
            </label>
            <input
              type="text"
              id="attraction_name"
              name="attraction_name"
              value={formData.attraction_name}
              onChange={onInputChange}
              required
              className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Dropdown Types */}
          <div>
            <label htmlFor="type_id" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type_id"
              name="type_id"
              value={formData.type_id}
              onChange={onInputChange}
              className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select Type</option>
              {types.map((t) => (
                <option key={t.type_id} value={t.type_id}>
                  {t.type_name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Districts */}
          <div>
            <label htmlFor="district_id" className="block text-sm font-medium text-gray-700 mb-1">
              District
            </label>
            <select
              id="district_id"
              name="district_id"
              value={formData.district_id}
              onChange={onInputChange}
              className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select District</option>
              {districts.map((d) => (
                <option key={d.district_id} value={d.district_id}>
                  {d.district_name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Sects */}
          <div>
            <label htmlFor="sect_id" className="block text-sm font-medium text-gray-700 mb-1">
              Sect
            </label>
            <select
              id="sect_id"
              name="sect_id"
              value={formData.sect_id}
              onChange={onInputChange}
              className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select Sect</option>
              {sects.map((s) => (
                <option key={s.sect_id} value={s.sect_id}>
                  {s.sect_name}
                </option>
              ))}
            </select>
          </div>

          {/* Coordinates */}
          <div>
            <label htmlFor="lat" className="block text-sm font-medium text-gray-700 mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              id="lat"
              name="lat"
              value={formData.lat}
              onChange={onInputChange}
              className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="lng" className="block text-sm font-medium text-gray-700 mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              id="lng"
              name="lng"
              value={formData.lng}
              onChange={onInputChange}
              className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Text Areas */}
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="sacred_obj" className="block text-sm font-medium text-gray-700 mb-1">
              Sacred Objects
            </label>
            <textarea
              id="sacred_obj"
              name="sacred_obj"
              value={formData.sacred_obj}
              onChange={onInputChange}
              rows={3}
              className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="offering" className="block text-sm font-medium text-gray-700 mb-1">
              Offerings
            </label>
            <textarea
              id="offering"
              name="offering"
              value={formData.offering}
              onChange={onInputChange}
              rows={3}
              className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Categories Checkboxes */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-4 border rounded-md max-h-48 overflow-y-auto bg-gray-50">
              {categories.map((cat) => (
                <label key={cat.category_id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.category_ids.includes(cat.category_id)}
                    onChange={() => onCategoryChange(cat.category_id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{cat.category_name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-2 lg:col-span-3 flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold transition"
            >
              {modalMode === 'edit' ? 'Update Attraction' : 'Add Attraction'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-800 px-6 py-3 rounded-md shadow-md hover:bg-gray-400 font-semibold transition"
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

export default function AttractionAdminPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableRef = useRef<HTMLTableElement>(null);

  // Data states
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [sects, setSects] = useState<Sect[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form and UI states
  const [formData, setFormData] = useState<AttractionFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [, setSearchTerm] = useState('');
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  // ปิด Modal Form และรีเซ็ตค่า
  const closeAddModal = () => {
    setShowForm(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  // ดึงข้อมูลหลักและ Lookup Tables ทั้งหมด
  const fetchData = async () => {
    try {
      setLoading(true);
      const [attractionsData, categoriesData, typesData, districtsData, sectsData] = await Promise.all([
        apiGet('/api/attraction'),
        apiGet('/api/category'),
        apiGet('/api/type'),
        apiGet('/api/district'),
        apiGet('/api/sect'),
      ]);

      setAttractions(attractionsData as Attraction[]);
      setCategories(categoriesData as Category[]);
      setTypes(typesData as Type[]);
      setDistricts(districtsData as District[]);
      setSects(sectsData as Sect[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ตรวจสอบ Parameter จาก URL เพื่อ Highlight แถวที่เพิ่งแก้ไขเสร็จ
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

  // สร้าง Lookup Maps สำหรับดึงชื่อแทน ID ได้อย่างรวดเร็ว
  const typeNameMap = useMemo(() => new Map(types.map((item) => [item.type_id, item.type_name])), [types]);
  const districtNameMap = useMemo(() => new Map(districts.map((item) => [item.district_id, item.district_name])), [districts]);
  const sectNameMap = useMemo(() => new Map(sects.map((item) => [item.sect_id, item.sect_name])), [sects]);

  // จัดการเมื่อกรอกข้อความในฟอร์ม
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // จัดการเมื่อเลือก Checkbox หมวดหมู่
  const handleCategoryChange = (categoryId: number) => {
    setFormData((prev) => {
      const newCategoryIds = prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter((id) => id !== categoryId)
        : [...prev.category_ids, categoryId];
      return { ...prev, category_ids: newCategoryIds };
    });
  };

  // จัดการเมื่อกดปุ่มบันทึกหรืออัปเดตสถานที่
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.attraction_name.trim()) {
      await showError('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อสถานที่');
      return;
    }

    const payload = {
      attraction_name: formData.attraction_name.trim(),
      type_id: formData.type_id ? parseInt(formData.type_id, 10) : null,
      district_id: formData.district_id ? parseInt(formData.district_id, 10) : null,
      sect_id: formData.sect_id ? parseInt(formData.sect_id, 10) : null,
      lat: formData.lat && formData.lat.trim() ? parseFloat(formData.lat) : null,
      lng: formData.lng && formData.lng.trim() ? parseFloat(formData.lng) : null,
      sacred_obj: formData.sacred_obj && formData.sacred_obj.trim() ? formData.sacred_obj.trim() : null,
      offering: formData.offering && formData.offering.trim() ? formData.offering.trim() : null,
      category_ids: formData.category_ids,
    };

    try {
      if (modalMode === 'edit' && editingId) {
        await apiPut(`/api/attraction/${editingId}`, payload);
        closeAddModal();
        await fetchData();
        setHighlightedId(editingId);
        setTimeout(() => setHighlightedId(null), 3000);
        await showSuccess('แก้ไขสำเร็จ', `แก้ไขสถานที่ "${formData.attraction_name.trim()}" เรียบร้อยแล้ว`);
      } else {
        await apiPost('/api/attraction', payload);
        closeAddModal();
        await fetchData();
        await showSuccess('บันทึกสำเร็จ', `เพิ่มสถานที่ "${formData.attraction_name.trim()}" เรียบร้อยแล้ว`);
      }
    } catch (err) {
      await showError('เกิดข้อผิดพลาด', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    }
  };

  // ดักฟัง Event Delegation สำหรับคลิกปุ่ม Edit บนตาราง
  useEffect(() => {
    const tableElement = tableRef.current;
    if (!tableElement) return;

    const handleTableClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const editButton = target.closest('.edit-attraction-btn') as HTMLButtonElement | null;

      if (editButton) {
        const attractionId = Number(editButton.dataset.attractionId);
        if (Number.isFinite(attractionId)) {
          apiGet(`/api/attraction/${attractionId}`)
            .then((data: Record<string, unknown>) => {
              setFormData({
                attraction_name: (data.attraction_name as string) || '',
                type_id: data.type_id !== null && data.type_id !== undefined ? String(data.type_id) : '',
                district_id: data.district_id !== null && data.district_id !== undefined ? String(data.district_id) : '',
                sect_id: data.sect_id !== null && data.sect_id !== undefined ? String(data.sect_id) : '',
                lat: data.lat !== null && data.lat !== undefined ? String(data.lat) : '',
                lng: data.lng !== null && data.lng !== undefined ? String(data.lng) : '',
                sacred_obj: (data.sacred_obj as string) || '',
                offering: (data.offering as string) || '',
                category_ids: Array.isArray(data.categories)
                  ? (data.categories as Array<{ category_id: number }>).map((cat) => cat.category_id)
                  : [],
              });
              setEditingId(attractionId);
              setModalMode('edit');
              setShowForm(true);
            })
            .catch((err) => {
              void showError('โหลดข้อมูลล้มเหลว', err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลสถานที่ได้');
            });
        }
      }
    };

    tableElement.addEventListener('click', handleTableClick);
    return () => tableElement.removeEventListener('click', handleTableClick);
  }, [attractions, navigate]);

  // กำหนดคอลัมน์ของตารางสถานที่
  const columns = [
    { key: 'attraction_id', label: 'ID', sortable: true, className: 'w-12' },
    { key: 'attraction_name', label: 'Name', sortable: true },
    { key: 'type_id', label: 'Type', sortable: false, render: (val: unknown) => getLookupTitle(val as string | number | null, typeNameMap) },
    { key: 'district_id', label: 'District', sortable: false, render: (val: unknown) => getLookupTitle(val as string | number | null, districtNameMap) },
    { key: 'sect_id', label: 'Sect', sortable: false, render: (val: unknown) => getLookupTitle(val as string | number | null, sectNameMap) },
    { key: 'lat', label: 'Lat', sortable: false, render: formatCoordinateCell, className: 'w-20' },
    { key: 'lng', label: 'Lng', sortable: false, render: formatCoordinateCell, className: 'w-20' },
    { key: 'sacred_obj', label: 'Sacred Objects', render: (val: unknown) => formatTextSnippet(val as string | null) },
    { key: 'offering', label: 'Offering', render: (val: unknown) => formatTextSnippet(val as string | null) },
    { key: 'categories', label: 'Categories', sortable: false, render: (val: unknown) => (val as string) || '-' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: unknown, row: Attraction) => (
        <div className="flex gap-2 justify-center">
          {<button
            type="button"
            className="edit-attraction-btn bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
            data-attraction-id={row.attraction_id}
          >
            Edit
          </button>}
        </div>
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
          <h1 className="text-3xl font-bold text-gray-900">Attraction Management</h1>
        </div>
      </div>

      {/* Modal Form Sub-Component */}
      {showForm && (
        <AttractionFormModal
          modalMode={modalMode}
          formData={formData}
          types={types}
          districts={districts}
          sects={sects}
          categories={categories}
          onInputChange={handleInputChange}
          onCategoryChange={handleCategoryChange}
          onSubmit={handleSubmit}
          onClose={closeAddModal}
        />
      )}

      {/* Table Section Card */}
      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Attractions</h2>
        </div>
        {error && <p className="text-red-500 mb-4 p-6">{error}</p>}
        {loading ? (
          <p className="text-gray-500 p-6">Loading...</p>
        ) : (
          <Table
            ref={tableRef}
            data={attractions}
            rowIdKey="attraction_id"
            highlightedRowId={highlightedId}
            columns={columns}
            pageSize={10}
            pageSizeOptions={[5, 10, 20, 50]}
            searchable={true}
            searchPlaceholder="Search attractions..."
            onSearch={handleSearch}
          />
        )}
      </div>
    </div>
  );
}

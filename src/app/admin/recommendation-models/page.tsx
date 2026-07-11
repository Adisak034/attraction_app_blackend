// =============================================================================
// app/admin/recommendation-models/page.tsx
// =============================================================================
// หน้าจัดการโมเดล AI สำหรับระบบแนะนำ (/admin/recommendation-models)
// ใช้อัปโหลดและโหลดใหม่ไฟล์โมเดล .pkl สำหรับ 3 หมวดหมู่
//
// ความสามารถหลัก:
//   - แสดงสถานะโมเดล 3 หมวดหมู่ (work/finance/love): มีไฟล์ (.pkl) หรือ โหลดในหน่วยความจำ
//   - อัปโหลดไฟล์ .pkl ใหม่แยกตามหมวดหมู่
//   - Reload Models: โหลดไฟล์ .pkl ที่มีอยู่ใหม่ทั้งหมดเข้าสู่ระบบแนะนำ (CF 100%)
//
// API ที่เรียก:
//   GET  /api/recommend/models/status  - ตรวจสอบสถานะโมเดล
//   POST /api/recommend/models/reload  - รีโหลดโมเดลทั้งหมด
//   POST /api/recommend/models/upload  - อัปโหลดไฟล์โมเดล (.pkl)
// =============================================================================

import React, { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiUploadFile } from '@/lib/apiClient';

// =============================================================================
// Types & Domain Constants
// =============================================================================

type ModelCategory = 'work' | 'finance' | 'love';

interface StatusResponse {
  models_loaded: Record<ModelCategory, boolean>;
  stored_files: Record<ModelCategory, boolean>;
}

const CATEGORY_LABELS: Record<ModelCategory, string> = {
  work: 'การงาน (Work)',
  finance: 'การเงิน (Finance)',
  love: 'ความรัก (Love)',
};

const CATEGORY_KEYS: ModelCategory[] = ['work', 'finance', 'love'];


// =============================================================================
// Sub-Components (Single Responsibility & Descriptive UI Chips)
// =============================================================================

interface ModelStatusCardProps {
  status: StatusResponse | null;
  loading: boolean;
}

function ModelStatusCard({ status, loading }: ModelStatusCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3">
        Model Status & Availability
      </h2>

      {loading ? (
        <p className="text-gray-500 py-6 text-center">Loading status...</p>
      ) : status ? (
        <div className="space-y-3">
          {CATEGORY_KEYS.map((category) => {
            const hasFile = status.stored_files[category];
            const isLoaded = status.models_loaded[category];

            return (
              <div
                key={category}
                className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-md p-3.5 bg-gray-50/50 gap-2"
              >
                <span className="text-base font-semibold text-gray-800">
                  {CATEGORY_LABELS[category]}
                </span>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className={`px-2.5 py-1 rounded border ${hasFile ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    file: {hasFile ? 'yes' : 'no'}
                  </span>
                  <span className={`px-2.5 py-1 rounded border ${isLoaded ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                    loaded: {isLoaded ? 'yes' : 'no'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 py-6 text-center">No status data available</p>
      )}
    </div>
  );
}

interface ModelUploadFormProps {
  selectedCategory: ModelCategory;
  submitting: boolean;
  message: string | null;
  error: string | null;
  onCategoryChange: (category: ModelCategory) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (e: FormEvent) => void;
}

function ModelUploadForm({
  selectedCategory,
  submitting,
  message,
  error,
  onCategoryChange,
  onFileChange,
  onSubmit,
}: ModelUploadFormProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3">
        Upload Recommendation Model (.pkl)
      </h2>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="category_select" className="block text-sm font-medium text-gray-700 mb-1">
            Target Category
          </label>
          <select
            id="category_select"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as ModelCategory)}
            disabled={submitting}
            className="w-full border rounded-md p-2.5 bg-white font-medium text-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
          >
            {CATEGORY_KEYS.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pkl_file_input" className="block text-sm font-medium text-gray-700 mb-1">
            Model File (.pkl)
          </label>
          <input
            id="pkl_file_input"
            type="file"
            accept=".pkl"
            disabled={submitting}
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            ไฟล์โมเดล Collaborative Filtering (CF) รูปแบบ Pickle ที่ฝึกสอนแล้วสำหรับหมวดที่เลือก
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-md hover:bg-blue-700 font-semibold shadow-sm disabled:opacity-60 transition"
        >
          <Upload size={18} />
          {submitting ? 'Uploading & Reloading...' : 'Upload Model'}
        </button>
      </form>

      {/* Status Notifications */}
      {message && (
        <div className="mt-5 p-3.5 text-sm font-semibold text-green-800 bg-green-50 border border-green-200 rounded-md">
          ✅ {message}
        </div>
      )}
      {error && (
        <div className="mt-5 p-3.5 text-sm font-semibold text-red-800 bg-red-50 border border-red-200 rounded-md">
          ❌ {error}
        </div>
      )}
    </div>
  );
}


// =============================================================================
// Main Component
// =============================================================================

export default function RecommendationModelsPage() {
  const navigate = useNavigate();

  // Data & UI states
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>('work');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ดึงสถานะโมเดลปัจจุบันของระบบ
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/api/recommend/models/status');
      setStatus(data as StatusResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดสถานะโมเดลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // จัดการอัปโหลดไฟล์โมเดล (.pkl)
  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!selectedFile) {
      setError('กรุณาเลือกไฟล์ .pkl');
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.pkl')) {
      setError('อนุญาตเฉพาะไฟล์นามสกุล .pkl เท่านั้น');
      return;
    }

    try {
      setSubmitting(true);
      await apiUploadFile('/api/recommend/models/upload', selectedFile, {
        category: selectedCategory,
      });
      setMessage('อัปโหลดโมเดลสำเร็จ และรีโหลดเข้าสู่ระบบแนะนำเรียบร้อยแล้ว');
      setSelectedFile(null);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดโมเดลไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  // รีโหลดโมเดลทั้งหมดจากไฟล์ .pkl เข้าสู่หน่วยความจำ
  const handleReload = async () => {
    setMessage(null);
    setError(null);
    try {
      setSubmitting(true);
      await apiPost('/api/recommend/models/reload', {});
      setMessage('รีโหลดโมเดลสำเร็จ เข้าสู่โหมดพร้อมใช้งาน (CF 100%) แล้ว');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'รีโหลดโมเดลไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            aria-label="ย้อนกลับ"
            title="ย้อนกลับ"
            className="h-10 w-10 flex items-center justify-center border rounded-md text-gray-700 hover:bg-gray-50 bg-white shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Recommendation Models</h1>
        </div>

        <button
          onClick={handleReload}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-md hover:bg-indigo-700 disabled:opacity-60 font-semibold shadow-sm transition"
        >
          <RefreshCw size={18} className={submitting ? 'animate-spin' : ''} />
          Reload Models
        </button>
      </div>

      {/* Main Grid: Status Card & Upload Form Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ModelStatusCard status={status} loading={loading} />

        <ModelUploadForm
          selectedCategory={selectedCategory}
          submitting={submitting}
          message={message}
          error={error}
          onCategoryChange={setSelectedCategory}
          onFileChange={setSelectedFile}
          onSubmit={handleUpload}
        />
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Upload } from 'lucide-react';
import { apiGet, apiPost, apiUploadFile } from '@/lib/apiClient';

type ModelCategory = 'work' | 'finance' | 'love';

type StatusResponse = {
  models_loaded: Record<ModelCategory, boolean>;
  stored_files: Record<ModelCategory, boolean>;
};

const CATEGORY_LABELS: Record<ModelCategory, string> = {
  work: 'การงาน (work)',
  finance: 'โชคลาภ (finance)',
  love: 'ความรัก (love)',
};

export default function RecommendationModelsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>('work');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!selectedFile) {
      setError('กรุณาเลือกไฟล์ .pkl');
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.pkl')) {
      setError('อนุญาตเฉพาะไฟล์ .pkl เท่านั้น');
      return;
    }

    try {
      setSubmitting(true);
      await apiUploadFile('/api/recommend/models/upload', selectedFile, {
        category: selectedCategory,
      });
      setMessage('อัปโหลดโมเดลสำเร็จ และรีโหลดแล้ว');
      setSelectedFile(null);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดโมเดลไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReload = async () => {
    setMessage(null);
    setError(null);
    try {
      setSubmitting(true);
      await apiPost('/api/recommend/models/reload', {});
      setMessage('รีโหลดโมเดลสำเร็จ');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'รีโหลดโมเดลไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            aria-label="ย้อนกลับ"
            title="ย้อนกลับ"
            className="h-10 w-10 flex items-center justify-center border rounded-md text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Recommendation Models</h1>
        </div>

        <button
          onClick={handleReload}
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-60"
        >
          <RefreshCw size={16} />
          Reload Models
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md border p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Model Status</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : status ? (
            <div className="space-y-3">
              {(['work', 'finance', 'love'] as ModelCategory[]).map((category) => (
                <div key={category} className="flex items-center justify-between border rounded-md p-3">
                  <span className="text-sm font-medium text-gray-700">{CATEGORY_LABELS[category]}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded ${status.stored_files[category] ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      file: {status.stored_files[category] ? 'yes' : 'no'}
                    </span>
                    <span className={`px-2 py-1 rounded ${status.models_loaded[category] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      loaded: {status.models_loaded[category] ? 'yes' : 'no'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md border p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload .pkl Model</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ModelCategory)}
                className="w-full border rounded-md p-2"
              >
                <option value="work">การงาน (work)</option>
                <option value="finance">โชคลาภ (finance)</option>
                <option value="love">ความรัก (love)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model File (.pkl)</label>
              <input
                type="file"
                accept=".pkl"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full border rounded-md p-2"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-60"
            >
              <Upload size={16} />
              Upload Model
            </button>
          </form>

          {message && <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiGet } from '@/lib/apiClient';
import { Table } from '@/components/Table';

interface Rating {
  rating_id: number;
  attraction_id: number;
  attraction_name: string;
  rating_work: number;
  rating_finance: number;
  rating_love: number;
  created_at?: string;
}

interface ReviewHistoryProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

export default function ReviewHistory({ userId, userName, onBack }: ReviewHistoryProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        setLoading(true);
        const data = await apiGet(`/api/rating/user/${userId}`);
        setRatings(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดประวัติการรีวิวได้');
        console.error('Failed to fetch ratings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [userId]);

  const renderRating = (rating: number) => {
    if (rating === 0) return <span className="text-gray-400 text-sm">-</span>;
    return (
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-faith-gold">{rating}/5</span>
      </div>
    );
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const columns = [
    { key: 'attraction_name', label: 'สถานที่', sortable: true },
    { 
      key: 'rating_work', 
      label: 'การงาน', 
      sortable: true,
      render: (val: number) => renderRating(val)
    },
    { 
      key: 'rating_finance', 
      label: 'โชคลาภการเงิน', 
      sortable: true,
      render: (val: number) => renderRating(val)
    },
    { 
      key: 'rating_love', 
      label: 'ความรัก', 
      sortable: true,
      render: (val: number) => renderRating(val)
    },
    { 
      key: 'created_at', 
      label: 'วันที่', 
      sortable: true,
      render: (val: string) => new Date(val).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#1A0404] to-black text-white pb-12">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-faith-gold/20">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-faith-gold/20 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-faith-gold" />
            </motion.button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-faith-gold">ประวัติการให้คะแนน</h1>
              <p className="text-gray-400 text-sm">ผู้ใช้: {userName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-faith-gold">{ratings.length}</p>
            <p className="text-gray-400 text-xs uppercase tracking-widest">สถานที่ที่ให้คะแนน</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin text-faith-gold mb-4" size={40} />
            <p className="text-gray-400">กำลังโหลดประวัติการให้คะแนน...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-950/50 border border-red-800/50 rounded-xl p-6 text-center"
          >
            <p className="text-red-400 font-semibold">{error}</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && ratings.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🙏</div>
            <p className="text-gray-400 text-lg mb-2">คุณยังไม่ได้ให้คะแนนสถานที่ใดเลย</p>
            <p className="text-gray-500 text-sm">เริ่มต้นการให้คะแนนสถานที่ศักดิ์สิทธิ์เพื่อแบ่งปันประสบการณ์ของคุณ</p>
          </motion.div>
        )}

        {/* Table View */}
        {!loading && !error && ratings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-x-auto bg-gray-950/50 rounded-lg shadow-lg p-6 border border-gray-800/50"
          >
            <style>{`
              #review-history-table * {
                background-color: transparent !important;
              }
              #review-history-table {
                color: #e5e7eb;
              }
              #review-history-table table {
                background-color: transparent !important;
                color: #e5e7eb;
              }
              #review-history-table thead {
                background-color: transparent !important;
              }
              #review-history-table thead tr {
                background-color: transparent !important;
                border-bottom: 2px solid #374151 !important;
              }
              #review-history-table thead th {
                color: #f3f4f6 !important;
                font-weight: 600 !important;
                border: none !important;
                background-color: transparent !important;
              }
              #review-history-table tbody {
                background-color: transparent !important;
              }
              #review-history-table tbody tr {
                border-bottom: 1px solid #1f2937 !important;
                background-color: transparent !important;
              }
              #review-history-table tbody tr:hover {
                background-color: rgba(55, 65, 81, 0.5) !important;
              }
              #review-history-table tbody td {
                color: #d1d5db !important;
                background-color: transparent !important;
              }
              #review-history-table > div:first-child {
                background-color: transparent !important;
              }
              #review-history-table > div > div:first-child {
                background-color: transparent !important;
                border: none !important;
              }
              #review-history-table > div > div:first-child input {
                background-color: #1f2937 !important;
                color: #f3f4f6 !important;
                border-color: #374151 !important;
              }
              #review-history-table > div > div:first-child input::placeholder {
                color: #9ca3af !important;
              }
              #review-history-table > div > div:first-child input:focus {
                border-color: #fbbf24 !important;
                outline: none !important;
              }
              #review-history-table > div > div:last-child {
                background-color: transparent !important;
                border-top: 1px solid #1f2937 !important;
                color: #d1d5db !important;
              }
              #review-history-table select {
                background-color: #1f2937 !important;
                color: #f3f4f6 !important;
                border-color: #374151 !important;
              }
              #review-history-table select:focus {
                border-color: #fbbf24 !important;
                outline: none !important;
              }
              #review-history-table select option {
                background-color: #1f2937 !important;
                color: #f3f4f6 !important;
              }
              #review-history-table button {
                border-color: #374151 !important;
                color: #d1d5db !important;
                background-color: transparent !important;
              }
              #review-history-table button:hover:not(:disabled) {
                background-color: rgba(55, 65, 81, 0.5) !important;
                border-color: #4b5563 !important;
              }
              #review-history-table button:disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
              }
              #review-history-table button.bg-blue-600 {
                background-color: #fbbf24 !important;
                color: #111827 !important;
                border-color: #fbbf24 !important;
              }
              #review-history-table button.bg-blue-600:hover {
                background-color: #f59e0b !important;
              }
            `}</style>
            <div id="review-history-table">
              <Table
                ref={tableRef}
                columns={columns}
                data={ratings}
                pageSize={10}
                searchable={true}
                onSearch={handleSearch}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, X } from 'lucide-react';
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
    <>
      {/* Overlay Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onBack}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <motion.div
          className="bg-[#1A0404] border border-faith-gold/20 rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 z-50 bg-[#1A0404] border-b border-faith-gold/10 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-faith-gold">ประวัติการให้คะแนน</h2>
              <p className="text-gray-400 text-xs mt-1">ผู้ใช้: {userName}</p>
            </div>
            <button
              onClick={onBack}
              className="p-1 hover:bg-faith-gold/10 rounded-lg transition-colors text-faith-gold flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollbar Hide CSS */}
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 scrollbar-hide">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16">
                <Loader2 className="animate-spin text-faith-gold mb-3 sm:mb-4" size={28} />
                <p className="text-gray-400 text-xs sm:text-sm">กำลังโหลดประวัติการให้คะแนน...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-950/50 border border-red-800/50 rounded-lg p-3 sm:p-4 text-center"
              >
                <p className="text-red-400 font-semibold text-xs sm:text-sm">{error}</p>
              </motion.div>
            )}

            {/* Empty State */}
            {!loading && !error && ratings.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 sm:py-16"
              >
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🙏</div>
                <p className="text-gray-400 text-sm sm:text-base mb-1">คุณยังไม่ได้ให้คะแนนสถานที่ใดเลย</p>
                <p className="text-gray-500 text-xs sm:text-sm">เริ่มต้นการให้คะแนนสถานที่ศักดิ์สิทธิ์เพื่อแบ่งปันประสบการณ์ของคุณ</p>
              </motion.div>
            )}

            {/* Table View */}
            {!loading && !error && ratings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            className="overflow-x-auto bg-gray-950/50 rounded-lg shadow-lg p-2 sm:p-4 border border-gray-800/50"
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
                font-size: 0.75rem;
                width: 100%;
              }
              @media (min-width: 640px) {
                #review-history-table table {
                  font-size: 0.875rem;
                }
              }
              #review-history-table thead {
                background-color: transparent !important;
              }
              #review-history-table thead tr {
                background-color: transparent !important;
                border-bottom: 1px solid #374151 !important;
              }
              #review-history-table thead th {
                color: #f3f4f6 !important;
                font-weight: 600 !important;
                border: none !important;
                background-color: transparent !important;
                padding: 0.5rem !important;
              }
              @media (min-width: 640px) {
                #review-history-table thead th {
                  padding: 0.75rem !important;
                }
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
                padding: 0.5rem !important;
              }
              @media (min-width: 640px) {
                #review-history-table tbody td {
                  padding: 0.75rem !important;
                }
              }
              #review-history-table > div:first-child {
                background-color: transparent !important;
              }
              #review-history-table > div > div:first-child {
                background-color: transparent !important;
                border: none !important;
                margin-bottom: 0.75rem !important;
              }
              #review-history-table > div > div:first-child input {
                background-color: #1f2937 !important;
                color: #f3f4f6 !important;
                border-color: #374151 !important;
                padding: 0.375rem 0.5rem !important;
                font-size: 0.75rem !important;
                min-height: 2.5rem !important;
                width: 100% !important;
              }
              @media (min-width: 640px) {
                #review-history-table > div > div:first-child input {
                  font-size: 0.875rem !important;
                  padding: 0.5rem 0.75rem !important;
                  min-height: 2.75rem !important;
                }
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
                font-size: 0.75rem !important;
                padding-top: 0.75rem !important;
                margin-top: 0.75rem !important;
              }
              @media (min-width: 640px) {
                #review-history-table > div > div:last-child {
                  font-size: 0.875rem !important;
                }
              }
              #review-history-table select {
                background-color: #1f2937 !important;
                color: #f3f4f6 !important;
                border-color: #374151 !important;
                min-height: 2.5rem !important;
                font-size: 0.75rem !important;
                padding: 0.25rem 0.5rem !important;
              }
              @media (min-width: 640px) {
                #review-history-table select {
                  font-size: 0.875rem !important;
                  min-height: 2.75rem !important;
                  padding: 0.5rem 0.75rem !important;
                }
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
                min-height: 2.5rem !important;
                padding: 0.25rem 0.5rem !important;
                font-size: 0.7rem !important;
              }
              @media (min-width: 640px) {
                #review-history-table button {
                  font-size: 0.875rem !important;
                  min-height: 2.75rem !important;
                  padding: 0.5rem 1rem !important;
                }
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
        </motion.div>
      </motion.div>
    </>
  );
}

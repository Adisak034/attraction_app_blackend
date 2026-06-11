import { useState, useEffect } from 'react';
import { Loader2, X, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiGet } from '@/lib/apiClient';

interface Rating {
  rating_id: number;
  attraction_id: number;
  attraction_name: string;
  rating_work: number;
  rating_finance: number;
  rating_love: number;
  created_at?: string;
}

interface RatingHistoryProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

export default function RatingHistory({ userId, userName, onBack }: RatingHistoryProps) {
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
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดประวัติการให้คะแนนได้');
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
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              className={i < Math.floor(rating) ? 'fill-faith-gold text-faith-gold' : 'text-gray-600'}
            />
          ))}
        </div>
        <span className="text-sm font-semibold text-faith-gold">{rating}/5</span>
      </div>
    );
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const filteredRatings = ratings.filter(rating =>
    rating.attraction_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

          {/* Search Bar */}
          <div className="sticky top-16 z-40 bg-[#1A0404] border-b border-faith-gold/10 px-6 py-3">
            <input
              type="text"
              placeholder="ค้นหาสถานที่..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:border-faith-gold focus:outline-none text-gray-100 placeholder-gray-500 transition-colors"
            />
          </div>

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

            {/* Empty Search Results */}
            {!loading && !error && ratings.length > 0 && filteredRatings.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <p className="text-gray-400 text-sm">ไม่พบสถานที่ที่ตรงกับการค้นหา</p>
              </motion.div>
            )}

            {/* List View */}
            {!loading && !error && filteredRatings.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {filteredRatings.map((rating, index) => (
                  <motion.div
                    key={rating.rating_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-faith-gold/30 transition-all hover:bg-gray-900/80"
                  >
                    {/* Attraction Name */}
                    <h3 className="text-sm sm:text-base font-semibold text-faith-gold mb-3 truncate">
                      {rating.attraction_name}
                    </h3>

                    {/* Ratings Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      {/* Work Rating */}
                      <div className="bg-gray-950/50 rounded p-2.5 sm:p-3">
                        <p className="text-xs text-gray-500 mb-1.5">การงาน</p>
                        {renderRating(rating.rating_work)}
                      </div>

                      {/* Finance Rating */}
                      <div className="bg-gray-950/50 rounded p-2.5 sm:p-3">
                        <p className="text-xs text-gray-500 mb-1.5">โชคลาภการเงิน</p>
                        {renderRating(rating.rating_finance)}
                      </div>

                      {/* Love Rating */}
                      <div className="bg-gray-950/50 rounded p-2.5 sm:p-3">
                        <p className="text-xs text-gray-500 mb-1.5">ความรัก</p>
                        {renderRating(rating.rating_love)}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
                      {rating.created_at && new Date(rating.created_at).toLocaleString('th-TH', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Results Info */}
            {!loading && !error && filteredRatings.length > 0 && (
              <div className="text-center text-xs text-gray-500 pt-4 pb-2">
                แสดง {filteredRatings.length} / {ratings.length} รายการ
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

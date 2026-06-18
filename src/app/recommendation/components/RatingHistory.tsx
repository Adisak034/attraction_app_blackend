// =============================================================================
// components/RatingHistory.tsx
// =============================================================================
// หน้าต่าง Modal สำหรับแสดงประวัติการให้คะแนน (Rating History) ของผู้ใช้
// 
// ความสามารถหลัก:
// - ดึงประวัติการรีวิวทั้งหมดของผู้ใช้จาก API (/api/rating/user/:id)
// - แสดงรายการสถานที่ที่เคยไปพร้อมกับคะแนนที่เคยให้ในแต่ละด้าน (ความรัก, การงาน, การเงิน)
// - เรียงลำดับจากรีวิวล่าสุด พร้อมแสดงวันที่รีวิว
// - จัดรูปแบบหน้าตาให้อ่านง่ายและมีดีไซน์กะทัดรัด (max-w-lg)
// =============================================================================

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
          className="w-full max-w-lg bg-[#1A0404]/95 border border-faith-gold/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto backdrop-blur-md relative"
        >
          {/* Decorative Elements */}
          <div className="absolute top-[-50%] left-[-10%] w-[60%] h-[60%] bg-amber-600/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-50%] right-[-10%] w-[60%] h-[60%] bg-red-800/10 blur-[100px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="p-4 sm:p-5 flex items-start justify-between border-b border-white/10 relative z-10 shrink-0 bg-gradient-to-b from-[#2D0A0A] to-transparent">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-faith-gold rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-[#1A0404]">
                  <Star size={20} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black gold-gradient-text text-faith-gold">ประวัติการให้คะแนน</h2>
                  <p className="text-xs text-gray-400 font-medium">ของ {userName}</p>
                </div>
              </div>
            </div>
            <button
              onClick={onBack}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white relative z-20"
            >
              <X size={16} />
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
          <div className="px-4 sm:px-5 py-3 shrink-0 relative z-10">
            <input
              type="text"
              placeholder="ค้นหาสถานที่..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#2D0A0A] border border-white/15 rounded-lg text-sm focus:border-faith-gold focus:outline-none text-white placeholder-white/50 transition-colors"
            />
          </div>

          {/* Content */}
          <div className="px-4 sm:px-5 pb-4 flex-1 overflow-y-auto relative z-10 custom-scrollbar">
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
                    className="bg-[#2D0A0A] border border-white/15 rounded-xl p-3 sm:p-4 hover:border-faith-gold/50 transition-all shadow-md"
                  >
                    {/* Attraction Name */}
                    <h3 className="text-sm font-semibold text-faith-gold mb-2 truncate">
                      {rating.attraction_name}
                    </h3>

                    {/* Ratings Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      {/* Work Rating */}
                      <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                        <p className="text-[10px] sm:text-xs text-gray-400 mb-1">การงาน</p>
                        {renderRating(rating.rating_work)}
                      </div>

                      {/* Finance Rating */}
                      <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                        <p className="text-[10px] sm:text-xs text-gray-400 mb-1">โชคลาภการเงิน</p>
                        {renderRating(rating.rating_finance)}
                      </div>

                      {/* Love Rating */}
                      <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                        <p className="text-[10px] sm:text-xs text-gray-400 mb-1">ความรัก</p>
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

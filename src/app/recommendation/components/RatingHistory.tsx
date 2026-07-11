// =============================================================================
// components/RatingHistory.tsx
// =============================================================================
// หน้าต่าง Modal สำหรับแสดงประวัติการให้คะแนน (Rating History) ของผู้ใช้
//
// ความสามารถหลัก:
//   - ดึงประวัติการรีวิวทั้งหมดของผู้ใช้จาก API (/api/rating/user/:id)
//   - แสดงรายการสถานที่พร้อมคะแนนแยกแต่ละด้าน (การงาน, การเงิน, ความรัก)
//   - เรียงลำดับจากรีวิวล่าสุด พร้อมแสดงวันที่รีวิว
//   - ใช้ ModalFrame ร่วมกัน และแยก Sub-component RatingRow ออกเพื่อความกระชับ
// =============================================================================

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History, Loader2, MapPin, Search, Star } from 'lucide-react';
import { apiGet } from '@/lib/apiClient';
import ModalFrame from './shared/ModalFrame';

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Sub-Component: CategoryStars
// =============================================================================

interface CategoryStarsProps {
  label: string;
  rating: number;
}

function CategoryStars({ label, rating }: CategoryStarsProps) {
  return (
    <div className="flex flex-col gap-1 bg-black/30 border border-white/5 rounded-lg p-2 text-center">
      <span className="text-[11px] font-bold text-gray-300">{label}</span>
      {rating === 0 ? (
        <span className="text-gray-500 text-xs">-</span>
      ) : (
        <div className="flex items-center justify-center gap-1">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={12}
                className={i < Math.floor(rating) ? 'fill-faith-gold text-faith-gold' : 'text-gray-600'}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-faith-gold ml-0.5">{rating}/5</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-Component: RatingRow
// =============================================================================

interface RatingRowProps {
  item: Rating;
  index: number;
}

function RatingRow({ item, index }: RatingRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-[#2D0A0A] border border-white/15 rounded-xl p-4 hover:border-faith-gold/50 transition-all shadow-md flex flex-col gap-3 group"
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
        <h3 className="text-base font-bold text-white group-hover:text-faith-gold transition-colors flex items-center gap-2">
          <MapPin size={16} className="text-faith-gold shrink-0" /> {item.attraction_name}
        </h3>
        {item.created_at && (
          <span className="text-[11px] text-gray-400 whitespace-nowrap">
            {new Date(item.created_at).toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <CategoryStars label="💼 การงาน" rating={item.rating_work} />
        <CategoryStars label="💰 การเงิน" rating={item.rating_finance} />
        <CategoryStars label="❤️ ความรัก" rating={item.rating_love} />
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function RatingHistory({ userId, userName, onBack }: RatingHistoryProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = (await apiGet(`/api/rating/user/${userId}`)) as Rating[];
        setRatings(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดประวัติการให้คะแนนได้');
        console.error('Failed to fetch ratings:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchRatings();
  }, [userId]);

  const filteredRatings = ratings.filter((r) =>
    r.attraction_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ModalFrame
      title="ประวัติการให้คะแนน"
      subtitle={`ของ ${userName}`}
      icon={<History size={20} />}
      onClose={onBack}
      maxWidthClassName="max-w-lg"
    >
      {/* Search Bar Section */}
      <div className="px-4 sm:px-5 py-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="ค้นหาสถานที่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 pl-11 bg-[#2D0A0A] border border-white/15 rounded-lg text-sm focus:border-faith-gold focus:outline-none text-white placeholder-white/50 transition-colors"
          />
        </div>
      </div>

      {/* Content List Section */}
      <div className="px-4 sm:px-5 pb-4 flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="h-48 flex flex-col items-center justify-center space-y-3 text-faith-gold">
            <Loader2 size={36} className="animate-spin" />
            <p className="font-semibold text-xs tracking-widest">กำลังโหลดประวัติ...</p>
          </div>
        ) : error ? (
          <div className="h-48 flex flex-col items-center justify-center space-y-3 text-red-400">
            <p className="font-semibold text-center text-sm">{error}</p>
          </div>
        ) : ratings.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center space-y-3 text-gray-400">
            <History size={44} className="opacity-20" />
            <p className="text-center font-medium text-sm">คุณยังไม่เคยให้คะแนนสถานที่ใดเลย</p>
          </div>
        ) : filteredRatings.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center space-y-3 text-gray-400">
            <Search size={44} className="opacity-20" />
            <p className="text-center font-medium text-sm">ไม่พบสถานที่ที่ตรงกับคำค้นหา</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRatings.map((item, index) => (
              <RatingRow key={item.rating_id || index} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    </ModalFrame>
  );
}

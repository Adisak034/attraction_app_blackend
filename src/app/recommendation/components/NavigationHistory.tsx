// =============================================================================
// components/NavigationHistory.tsx
// =============================================================================
// หน้าต่าง Modal สำหรับแสดงประวัติการนำทาง (Navigation History) ของผู้ใช้
//
// ความสามารถหลัก:
//   - ดึงประวัติว่าผู้ใช้เคยกดดูแผนที่ (view_map) ไปสถานที่ไหนบ้างผ่าน Activity Logs
//   - แสดงปุ่ม "ให้คะแนน" สำหรับสถานที่ที่ไปมาแล้วแต่ยังไม่ได้รีวิว
//   - เชื่อมต่อกับ RatingModal เมื่อกดปุ่มให้คะแนน
//   - ใช้ ModalFrame ร่วมกันเพื่อลดโค้ดซ้ำซ้อน
// =============================================================================

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { apiGet } from '@/lib/apiClient';
import ModalFrame from './shared/ModalFrame';

// =============================================================================
// Types
// =============================================================================

interface NavHistoryItem {
  attraction_id: number;
  attraction_name: string;
  last_navigated_at: string;
  has_rated: number;
}

interface NavigationHistoryProps {
  userId: string;
  userName: string;
  onBack: () => void;
  onRatePlace: (attractionId: string, attractionName: string) => void;
  refreshTrigger?: number;
}

// =============================================================================
// Sub-Component: NavHistoryRow
// =============================================================================

interface NavHistoryRowProps {
  item: NavHistoryItem;
  index: number;
  onRate: () => void;
}

function NavHistoryRow({ item, index, onRate }: NavHistoryRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-[#2D0A0A] border border-white/15 rounded-xl p-3 sm:p-4 hover:border-faith-gold/50 transition-all shadow-md flex justify-between items-center gap-3 group"
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-faith-gold mb-1 truncate flex items-center gap-2">
          <MapPin size={16} className="shrink-0" /> <span className="truncate">{item.attraction_name}</span>
        </h3>
        {item.last_navigated_at && (
          <p className="text-xs text-gray-400">
            เปิดดูแผนที่ล่าสุดเมื่อ: {new Date(item.last_navigated_at).toLocaleString('th-TH')}
          </p>
        )}
      </div>

      <div className="shrink-0">
        {item.has_rated === 1 ? (
          <div className="flex items-center gap-1.5 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full text-xs font-bold border border-green-400/20">
            <CheckCircle size={14} /> ให้คะแนนแล้ว
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRate}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-faith-gold hover:bg-amber-400 rounded-lg text-[#1A0404] text-[10px] sm:text-xs font-bold transition-all shadow-lg hover:shadow-faith-gold/40 flex items-center gap-1.5"
          >
            ให้คะแนน
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function NavigationHistory({
  userId,
  userName,
  onBack,
  onRatePlace,
  refreshTrigger = 0,
}: NavigationHistoryProps) {
  const [history, setHistory] = useState<NavHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = (await apiGet(`/api/activity-logs/user/${userId}/navigations`)) as NavHistoryItem[];
        setHistory(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดประวัติการนำทางได้');
        console.error('Failed to fetch navigation history:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchHistory();
  }, [userId, refreshTrigger]);

  const filteredHistory = history.filter((item) =>
    item.attraction_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ModalFrame
      title="ประวัติการนำทาง"
      subtitle={`ของ ${userName}`}
      icon={<Navigation size={20} />}
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
            <p className="font-semibold text-xs tracking-widest">กำลังโหลดข้อมูล...</p>
          </div>
        ) : error ? (
          <div className="h-48 flex flex-col items-center justify-center space-y-3 text-red-400">
            <p className="font-semibold text-center text-sm">{error}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center space-y-3 text-gray-400">
            <Navigation size={44} className="opacity-20" />
            <p className="text-center font-medium text-sm">ยังไม่มีประวัติการกดดูแผนที่</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center space-y-3 text-gray-400">
            <Search size={44} className="opacity-20" />
            <p className="text-center font-medium text-sm">ไม่พบสถานที่ที่ตรงกับคำค้นหา</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item, index) => (
              <NavHistoryRow
                key={`${item.attraction_id}-${index}`}
                item={item}
                index={index}
                onRate={() => onRatePlace(item.attraction_id.toString(), item.attraction_name)}
              />
            ))}
          </div>
        )}
      </div>
    </ModalFrame>
  );
}

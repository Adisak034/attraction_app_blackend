// =============================================================================
// components/NavigationHistory.tsx
// =============================================================================
// หน้าต่าง Modal สำหรับแสดงประวัติการนำทาง (Navigation History) ของผู้ใช้
// 
// ความสามารถหลัก:
// - ดึงประวัติว่าผู้ใช้เคยกดปุ่ม "นำทาง" ไปสถานที่ไหนบ้างผ่าน Activity Logs
// - แสดงปุ่ม "ให้คะแนน" (Rate) สีทองอร่ามเด่นชัด สำหรับสถานที่ที่ไปมาแล้วแต่ยังไม่ได้รีวิว
// - เชื่อมต่อกับหน้าต่าง RatingModal เมื่อกดปุ่มให้คะแนน
// - จัดรูปแบบสไตล์กะทัดรัด (max-w-lg) เพื่อการแสดงผลที่สวยงามบน Desktop
// =============================================================================

import { useState, useEffect } from 'react';
import { Loader2, X, Navigation, MapPin, CheckCircle, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiGet } from '@/lib/apiClient';

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

export default function NavigationHistory({ userId, userName, onBack, onRatePlace, refreshTrigger = 0 }: NavigationHistoryProps) {
  const [history, setHistory] = useState<NavHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await apiGet(`/api/activity-logs/user/${userId}/navigations`);
        setHistory(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดประวัติการนำทางได้');
        console.error('Failed to fetch navigation history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId, refreshTrigger]);

  const filteredHistory = history.filter(item =>
    item.attraction_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Overlay Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onBack}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
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
                  <Navigation size={20} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black gold-gradient-text text-faith-gold">ประวัติการนำทาง</h2>
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

          {/* Search Bar */}
          <div className="px-4 sm:px-5 py-3 shrink-0 relative z-10">
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

          {/* Content */}
          <div className="px-4 sm:px-5 pb-4 flex-1 overflow-y-auto relative z-10 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 text-faith-gold">
                <Loader2 size={40} className="animate-spin" />
                <p className="font-semibold tracking-widest text-sm">กำลังโหลดข้อมูล...</p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 text-red-400">
                <X size={40} className="bg-red-500/10 p-2 rounded-full" />
                <p className="font-semibold text-center">{error}</p>
              </div>
            ) : history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 text-gray-400">
                <Navigation size={48} className="opacity-20" />
                <p className="text-center font-medium">ยังไม่มีประวัติการกดดูแผนที่ครับ</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 text-gray-400">
                <Search size={48} className="opacity-20" />
                <p className="text-center font-medium">ไม่พบสถานที่ที่ตรงกับคำค้นหา</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((item, index) => (
                  <motion.div
                    key={`${item.attraction_id}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-[#2D0A0A] border border-white/15 rounded-xl p-3 sm:p-4 hover:border-faith-gold/50 transition-all shadow-md flex justify-between items-center group"
                  >
                    <div>
                      {/* Attraction Name */}
                      <h3 className="text-sm font-semibold text-faith-gold mb-1 truncate max-w-[180px] sm:max-w-[250px] flex items-center gap-2">
                        <MapPin size={16} /> {item.attraction_name}
                      </h3>
                      {item.last_navigated_at && (
                        <p className="text-xs text-gray-400">
                          เปิดดูแผนที่ล่าสุดเมื่อ: {new Date(item.last_navigated_at).toLocaleString('th-TH')}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center justify-end">
                      {item.has_rated === 1 ? (
                        <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-full text-sm font-bold border border-green-400/20">
                          <CheckCircle size={16} /> ให้คะแนนแล้ว
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onRatePlace(item.attraction_id.toString(), item.attraction_name)}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-faith-gold hover:bg-amber-400 rounded-lg text-[#1A0404] text-[10px] sm:text-xs font-bold transition-all shadow-lg hover:shadow-faith-gold/40 flex items-center gap-1.5"
                        >
                          ให้คะแนน
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

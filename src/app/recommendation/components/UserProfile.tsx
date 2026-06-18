// =============================================================================
// components/UserProfile.tsx
// =============================================================================
// หน้าต่าง Modal สำหรับแสดงข้อมูลโปรไฟล์ของผู้ใช้งาน
// 
// ความสามารถหลัก:
// - แสดงชื่อผู้ใช้ (Username) และสถิติต่างๆ เช่น จำนวนการรีวิวสถานที่
// - ดึงข้อมูลสถิติการรีวิวจาก API (/api/rating/user/:id)
// - ดีไซน์สไตล์ Glassmorphism ขนาดกะทัดรัด (max-w-md) พร้อม Animation
// =============================================================================

import { useState, useEffect } from 'react';
import { User, Mail, Trophy, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiGet } from '@/lib/apiClient';

interface UserProfileProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

export default function UserProfile({ userId, userName, onBack }: UserProfileProps) {
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatingStats = async () => {
      try {
        const ratings = await apiGet(`/api/rating/user/${userId}`);
        setRatingCount(ratings.length || 0);
      } catch (error) {
        console.error('Failed to fetch rating stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchRatingStats();
    }
  }, [userId]);

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
          className="w-full max-w-md bg-[#1A0404]/95 border border-faith-gold/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto backdrop-blur-md relative"
        >
          {/* Decorative Elements */}
          <div className="absolute top-[-50%] left-[-10%] w-[60%] h-[60%] bg-amber-600/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-50%] right-[-10%] w-[60%] h-[60%] bg-red-800/10 blur-[100px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="p-4 sm:p-5 flex items-start justify-between border-b border-white/10 relative z-10 shrink-0 bg-gradient-to-b from-[#2D0A0A] to-transparent">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-faith-gold rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-[#1A0404]">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black gold-gradient-text text-faith-gold">ข้อมูลผู้ใช้</h2>
                  <p className="text-xs text-gray-400 font-medium">รหัสของคุณ: {userId}</p>
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

          {/* Content */}
          <div className="p-3 sm:p-4 flex-1 overflow-y-auto relative z-10 custom-scrollbar">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#2D0A0A] border border-white/15 rounded-xl p-3 sm:p-4 shadow-md"
            >
              {/* User Avatar Circle */}
              <div className="flex justify-center mb-3">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-14 h-14 bg-gradient-to-br from-faith-gold/50 to-faith-gold/20 rounded-full flex items-center justify-center border-2 border-faith-gold shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                >
                  <User size={24} className="text-faith-gold" />
                </motion.div>
              </div>

              {/* User Information */}
              <div className="space-y-2 sm:space-y-3">
                {/* Username */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-black/20 border border-white/5 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <User size={14} className="text-faith-gold flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-400">ชื่อผู้ใช้</span>
                  </div>
                  <p className="text-sm sm:text-xl font-black text-white break-words">{userName}</p>
                </motion.div>

                {/* User ID */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-black/20 border border-white/5 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Mail size={14} className="text-faith-gold flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-400">ID ผู้ใช้</span>
                  </div>
                  <p className="text-xs sm:text-sm font-mono text-gray-200 break-all">{userId}</p>
                </motion.div>

                {/* Statistics */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-black/20 border border-white/5 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Trophy size={14} className="text-faith-gold flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-400">จำนวนรีวิว</span>
                  </div>
                  <div>
                    {loading ? (
                      <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                    ) : (
                      <p className="text-sm sm:text-xl font-black text-faith-gold">{ratingCount} รีวิว</p>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

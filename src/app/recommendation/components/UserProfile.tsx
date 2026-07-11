// =============================================================================
// components/UserProfile.tsx
// =============================================================================
// หน้าต่าง Modal สำหรับแสดงข้อมูลโปรไฟล์ของผู้ใช้งาน
//
// ความสามารถหลัก:
//   - แสดงชื่อผู้ใช้ (Username) และสถิติต่างๆ เช่น จำนวนการรีวิวสถานที่
//   - ดึงข้อมูลสถิติการรีวิวจาก API (/api/rating/user/:id)
//   - ใช้ ModalFrame ร่วมกันเพื่อลดโค้ดซ้ำซ้อน
// =============================================================================

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Trophy, User } from 'lucide-react';
import { apiGet } from '@/lib/apiClient';
import ModalFrame from './shared/ModalFrame';

// =============================================================================
// Types
// =============================================================================

interface UserProfileProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

// =============================================================================
// Sub-Component: ProfileStatRow
// =============================================================================

interface ProfileStatRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  delay?: number;
}

function ProfileStatRow({ icon, label, value, delay = 0 }: ProfileStatRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="bg-black/20 border border-white/5 rounded-xl p-3"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-faith-gold shrink-0">{icon}</div>
        <span className="text-[10px] sm:text-xs font-semibold text-gray-400">{label}</span>
      </div>
      <div>{value}</div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function UserProfile({ userId, userName, onBack }: UserProfileProps) {
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatingStats = async () => {
      try {
        setLoading(true);
        const ratings = (await apiGet(`/api/rating/user/${userId}`)) as unknown[];
        setRatingCount(ratings?.length || 0);
      } catch (error) {
        console.error('Failed to fetch rating stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      void fetchRatingStats();
    }
  }, [userId]);

  return (
    <ModalFrame
      title="ข้อมูลผู้ใช้"
      subtitle={`รหัสของคุณ: ${userId}`}
      icon={<User size={20} />}
      onClose={onBack}
      maxWidthClassName="max-w-md"
    >
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#2D0A0A] border border-white/15 rounded-2xl p-4 sm:p-5 shadow-md space-y-4"
        >
          {/* Avatar Circle */}
          <div className="flex justify-center py-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-16 h-16 bg-gradient-to-br from-faith-gold/50 to-faith-gold/20 rounded-full flex items-center justify-center border-2 border-faith-gold shadow-[0_0_30px_rgba(212,175,55,0.3)]"
            >
              <User size={28} className="text-faith-gold" />
            </motion.div>
          </div>

          {/* Stat Rows */}
          <div className="space-y-3">
            <ProfileStatRow
              icon={<User size={14} />}
              label="ชื่อผู้ใช้"
              value={<p className="text-sm sm:text-xl font-black text-white break-words">{userName}</p>}
              delay={0.15}
            />

            <ProfileStatRow
              icon={<Mail size={14} />}
              label="ID ผู้ใช้"
              value={<p className="text-xs sm:text-sm font-mono text-gray-200 break-all">{userId}</p>}
              delay={0.2}
            />

            <ProfileStatRow
              icon={<Trophy size={14} />}
              label="จำนวนรีวิว"
              value={
                loading ? (
                  <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                ) : (
                  <p className="text-sm sm:text-xl font-black text-faith-gold">{ratingCount} รีวิว</p>
                )
              }
              delay={0.25}
            />
          </div>
        </motion.div>
      </div>
    </ModalFrame>
  );
}

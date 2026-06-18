// =============================================================================
// components/UserMenu.tsx
// =============================================================================
// เมนูผู้ใช้งาน (Dropdown Menu) ที่แสดงอยู่มุมขวาบนของหน้าเว็บ
// 
// ความสามารถหลัก:
// - แสดงปุ่ม Avatar และชื่อผู้ใช้งานที่ล็อกอินอยู่
// - กดคลิกเพื่อเปิด Dropdown Menu เลื่อนลงมา
// - มีตัวเลือก: ไปหน้าแอดมิน(เฉพาะ Admin), โปรไฟล์, ประวัติให้คะแนน, ประวัติการเดินทาง
// - มีปุ่ม "ออกจากระบบ" (Logout)
// - ดีไซน์การเปิด/ปิดเมนูด้วย Framer Motion แบบ Classic Dropdown
// =============================================================================

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, History, LogOut, User, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserMenuProps {
  userName: string;
  isAdmin?: boolean;
  onNavigateAdmin?: () => void;
  onViewHistory: () => void;
  onViewNavigationHistory: () => void;
  onViewProfile: () => void;
  onLogout: () => void;
}

export default function UserMenu({ userName, isAdmin, onNavigateAdmin, onViewHistory, onViewNavigationHistory, onViewProfile, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleViewHistory = () => {
    setIsOpen(false);
    onViewHistory();
  };

  const handleViewNavigationHistory = () => {
    setIsOpen(false);
    onViewNavigationHistory();
  };

  const handleViewProfile = () => {
    setIsOpen(false);
    onViewProfile();
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="px-6 py-2 bg-white/10 hover:bg-faith-gold text-white hover:text-[#1A0404] rounded-full text-xs font-black uppercase tracking-widest transition-all backdrop-blur-md border border-white/20 hover:border-faith-gold group flex items-center gap-2"
      >
        <span className="hidden sm:inline truncate max-w-[120px]">ผู้ใช้: {userName.substring(0, 12)}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-[#1A0404]/95 border border-faith-gold/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-[100]"
          >
            <div className="py-2">
              {/* Admin Panel Button (only if admin) */}
              {isAdmin && (
                <motion.button
                  onClick={() => { setIsOpen(false); onNavigateAdmin?.(); }}
                  whileHover={{ x: 4 }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-faith-gold hover:bg-faith-gold/20 transition-colors text-sm font-semibold border-b border-white/10"
                >
                  <User size={16} />
                  จัดการระบบ (Admin)
                </motion.button>
              )}

              {/* View Profile Button */}
              <motion.button
                onClick={handleViewProfile}
                whileHover={{ x: 4 }}
                className="w-full px-4 py-3 flex items-center gap-3 text-gray-200 hover:bg-faith-gold/20 hover:text-faith-gold transition-colors text-sm font-semibold border-b border-white/10"
              >
                <User size={16} />
                ข้อมูลผู้ใช้
              </motion.button>

              {/* View History Button */}
              <motion.button
                onClick={handleViewHistory}
                whileHover={{ x: 4 }}
                className="w-full px-4 py-3 flex items-center gap-3 text-gray-200 hover:bg-faith-gold/20 hover:text-faith-gold transition-colors text-sm font-semibold border-b border-white/10"
              >
                <History size={16} />
                ประวัติการให้คะแนน
              </motion.button>

              {/* View Navigation History Button */}
              <motion.button
                onClick={handleViewNavigationHistory}
                whileHover={{ x: 4 }}
                className="w-full px-4 py-3 flex items-center gap-3 text-gray-200 hover:bg-faith-gold/20 hover:text-faith-gold transition-colors text-sm font-semibold border-b border-white/10"
              >
                <Navigation size={16} />
                ประวัติการนำทาง
              </motion.button>

              {/* Logout Button */}
              <motion.button
                onClick={handleLogout}
                whileHover={{ x: 4 }}
                className="w-full px-4 py-3 flex items-center gap-3 text-gray-200 hover:bg-red-500/20 hover:text-red-400 transition-colors text-sm font-semibold"
              >
                <LogOut size={16} />
                ออกจากระบบ
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

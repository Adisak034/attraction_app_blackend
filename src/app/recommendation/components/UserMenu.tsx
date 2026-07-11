// =============================================================================
// components/UserMenu.tsx
// =============================================================================
// เมนูผู้ใช้งาน (Dropdown Menu) ที่แสดงอยู่มุมขวาบนของหน้าเว็บ
//
// ความสามารถหลัก:
//   - แสดงปุ่ม Avatar และชื่อผู้ใช้งานที่ล็อกอินอยู่
//   - กดคลิกเพื่อเปิด Dropdown Menu เลื่อนลงมา
//   - มีตัวเลือก: ไปหน้าแอดมิน(เฉพาะ Admin), โปรไฟล์, ประวัติให้คะแนน, ประวัติการนำทาง, ออกจากระบบ
//   - แยก Sub-component DropdownItem เพื่อความกระชับ ไม่ซ้ำซ้อน
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, History, LogOut, Navigation, User } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface UserMenuProps {
  userName: string;
  isAdmin?: boolean;
  onNavigateAdmin?: () => void;
  onViewHistory: () => void;
  onViewNavigationHistory: () => void;
  onViewProfile: () => void;
  onLogout: () => void;
}

// =============================================================================
// Sub-Component: DropdownItem
// =============================================================================

interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'normal' | 'admin' | 'danger';
  borderBottom?: boolean;
}

function DropdownItem({ icon, label, onClick, variant = 'normal', borderBottom = true }: DropdownItemProps) {
  const colorClassName =
    variant === 'admin'
      ? 'text-faith-gold hover:bg-faith-gold/20'
      : variant === 'danger'
      ? 'text-gray-200 hover:bg-red-500/20 hover:text-red-400'
      : 'text-gray-200 hover:bg-faith-gold/20 hover:text-faith-gold';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ x: 4 }}
      className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-sm font-semibold ${colorClassName} ${
        borderBottom ? 'border-b border-white/10' : ''
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </motion.button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function UserMenu({
  userName,
  isAdmin,
  onNavigateAdmin,
  onViewHistory,
  onViewNavigationHistory,
  onViewProfile,
  onLogout,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="px-6 py-2 bg-white/10 hover:bg-faith-gold text-white hover:text-[#1A0404] rounded-full text-xs font-black uppercase tracking-widest transition-all backdrop-blur-md border border-white/20 hover:border-faith-gold group flex items-center gap-2"
      >
        <span className="hidden sm:inline truncate max-w-[120px]">ผู้ใช้: {userName.substring(0, 12)}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
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
              {isAdmin && (
                <DropdownItem
                  icon={<User size={16} />}
                  label="จัดการระบบ (Admin)"
                  variant="admin"
                  onClick={() => triggerAction(() => onNavigateAdmin?.())}
                />
              )}

              <DropdownItem
                icon={<User size={16} />}
                label="ข้อมูลผู้ใช้"
                onClick={() => triggerAction(onViewProfile)}
              />

              <DropdownItem
                icon={<History size={16} />}
                label="ประวัติการให้คะแนน"
                onClick={() => triggerAction(onViewHistory)}
              />

              <DropdownItem
                icon={<Navigation size={16} />}
                label="ประวัติการนำทาง"
                onClick={() => triggerAction(onViewNavigationHistory)}
              />

              <DropdownItem
                icon={<LogOut size={16} />}
                label="ออกจากระบบ"
                variant="danger"
                borderBottom={false}
                onClick={() => triggerAction(onLogout)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

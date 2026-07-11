// =============================================================================
// components/shared/ModalFrame.tsx
// =============================================================================
// โครงสร้างมาตรฐานสำหรับหน้าต่าง Modal ในหน้าระบบมู (NavigationHistory, RatingHistory, Profile)
//
// ความสามารถหลัก:
//   - จัดการพื้นหลังเบลอ (Backdrop) ดักจับคลิกเพื่อปิด
//   - จัดการ Framer Motion Animation เปิด/ปิด Modal ได้อย่างนุ่มนวล
//   - ตกแต่งเอฟเฟกต์แสงหมอก (Glow effect) ด้านหลัง
//   - ส่วนหัวมาตรฐาน (Header + Subtitle + Icon + ปุ่ม Close 'X')
//   - แยก Sub-components: ModalBackdrop, ModalGlowEffects, ModalHeaderBar
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ModalFrameProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
  headerRightAction?: React.ReactNode;
}

// =============================================================================
// Sub-Component: ModalBackdrop
// =============================================================================

interface ModalBackdropProps {
  onClose: () => void;
}

function ModalBackdrop({ onClose }: ModalBackdropProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
    />
  );
}

// =============================================================================
// Sub-Component: ModalGlowEffects
// =============================================================================

function ModalGlowEffects() {
  return (
    <>
      <div className="absolute top-[-50%] left-[-10%] w-[60%] h-[60%] bg-amber-600/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-50%] right-[-10%] w-[60%] h-[60%] bg-red-800/10 blur-[100px] rounded-full pointer-events-none" />
    </>
  );
}

// =============================================================================
// Sub-Component: ModalHeaderBar
// =============================================================================

interface ModalHeaderBarProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClose: () => void;
  headerRightAction?: React.ReactNode;
}

function ModalHeaderBar({ title, subtitle, icon, onClose, headerRightAction }: ModalHeaderBarProps) {
  return (
    <div className="p-4 sm:p-5 flex items-start justify-between border-b border-white/10 relative z-10 shrink-0 bg-gradient-to-b from-[#2D0A0A] to-transparent">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-faith-gold rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-[#1A0404]">
          {icon}
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black gold-gradient-text text-faith-gold leading-tight">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-gray-400 font-medium mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-20">
        {headerRightAction}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          aria-label="ปิดหน้าต่าง"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ModalFrame({
  title,
  subtitle,
  icon,
  onClose,
  children,
  maxWidthClassName = 'max-w-lg',
  headerRightAction,
}: ModalFrameProps) {
  return (
    <>
      <ModalBackdrop onClose={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className={`w-full ${maxWidthClassName} bg-[#1A0404]/95 border border-faith-gold/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto backdrop-blur-md relative`}
          onClick={(e) => e.stopPropagation()}
        >
          <ModalGlowEffects />

          <ModalHeaderBar
            title={title}
            subtitle={subtitle}
            icon={icon}
            onClose={onClose}
            headerRightAction={headerRightAction}
          />

          <div className="flex-1 flex flex-col overflow-hidden relative z-10">{children}</div>
        </div>
      </motion.div>
    </>
  );
}

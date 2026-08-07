// =============================================================================
// app/recommendation/components/LandingView.tsx
// =============================================================================
// หน้าแรกสุด Landing Page แสดงข้อความนำทางและปุ่มเข้าสู่ระบบ / เริ่มต้นเส้นทางศรัทธา
//
// ความสามารถหลัก:
//   - แสดงปุ่ม "เข้าสู่ระบบ" ด้านขวาบน (LandingNavBar)
//   - แสดงหัวข้อและประกายดาวเรืองแสง (LandingHeroTitle)
//   - แสดงข้อความอธิบายและปุ่มใหญ่เริ่มต้น (LandingHeroCTA)
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, LogIn } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface LandingViewProps {
  onLoginClick: () => void;
  onStartClick: () => void;
}

// =============================================================================
// Sub-Component: LandingNavBar
// =============================================================================

interface LandingNavBarProps {
  onLoginClick: () => void;
}

function LandingNavBar({ onLoginClick }: LandingNavBarProps) {
  return (
    <nav className="flex justify-end items-center gap-4 mb-10">
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLoginClick}
        className="bg-white/10 text-white px-6 py-2.5 sm:px-5 sm:py-2 rounded-full font-bold text-sm sm:text-xs border border-white/10 hover:bg-white/20 transition-all flex items-center gap-2 backdrop-blur-md"
      >
        <LogIn size={18} /> เข้าสู่ระบบ
      </motion.button>
    </nav>
  );
}

// =============================================================================
// Sub-Component: LandingHeroTitle
// =============================================================================

function LandingHeroTitle() {
  return (
    <>
      <div className="mb-20 flex justify-center items-center gap-3">
        <span className="text-faith-gold font-black tracking-[0.3em] text-sm uppercase">Faith Nakonpathom</span>
      </div>

      <motion.h1
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl sm:text-4xl md:text-6xl font-black mb-8 md:mb-12 gold-gradient-text tracking-normal leading-normal drop-shadow-2xl overflow-visible"
      >
        การท่องเที่ยวเชิงความเชื่อในจังหวัดนครปฐม
      </motion.h1>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg md:text-2xl text-faith-gold font-bold mb-6 tracking-wide drop-shadow-md"
      >
        &ldquo;ค้นพบเส้นทางท่องเที่ยวในแบบที่เป็นคุณ&rdquo;
      </motion.h2>
    </>
  );
}

// =============================================================================
// Sub-Component: LandingHeroCTA
// =============================================================================

interface LandingHeroCTAProps {
  onStartClick: () => void;
}

function LandingHeroCTA({ onStartClick }: LandingHeroCTAProps) {
  return (
    <>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-gray-300 max-w-3xl text-lg font-light leading-relaxed mb-12 drop-shadow-md mx-auto"
      >
        แพลตฟอร์มท่องเที่ยวเชิงความเชื่อ จังหวัดนครปฐม
        รวบรวมสถานที่ศักดิ์สิทธิ์และจุดท่องเที่ยวสำคัญทั่วจังหวัด พร้อมระบบ{' '}
        <span className="text-faith-gold font-medium">Recommendation System</span>{' '}
        ที่ทำหน้าที่เป็นผู้ช่วยส่วนตัว คอยวิเคราะห์และนำเสนอสถานที่ตามความสนใจของคุณ เพื่อให้ทุกการเดินทางเต็มไปด้วยความหมายและเป็นสิริมงคล
      </motion.p>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(212, 175, 55, 0.4)' }}
        whileTap={{ scale: 0.95 }}
        onClick={onStartClick}
        className="bg-faith-gold hover:bg-amber-400 text-[#1A0404] px-10 py-5 sm:px-12 sm:py-5 rounded-full font-black text-lg sm:text-xl shadow-[0_0_25px_rgba(212,175,55,0.3)] transition-all flex items-center gap-3.5 mb-20 group"
      >
        <span>เริ่มต้นเส้นทางศรัทธา</span>
        <ArrowRight size={26} className="group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function LandingView({ onLoginClick, onStartClick }: LandingViewProps) {
  return (
    <motion.div
      key="selection"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto px-6 py-10 relative z-10 min-h-screen flex flex-col"
    >
      <LandingNavBar onLoginClick={onLoginClick} />

      <div className="flex-1 flex flex-col justify-center items-center text-center relative z-20">
        <LandingHeroTitle />
        <LandingHeroCTA onStartClick={onStartClick} />
      </div>

      <footer className="py-12 text-center text-xs font-semibold text-gray-500 relative z-10 pointer-events-none mt-auto">
        © 2026 Faith Nakonpathom • AI Recommendation System
      </footer>
    </motion.div>
  );
}

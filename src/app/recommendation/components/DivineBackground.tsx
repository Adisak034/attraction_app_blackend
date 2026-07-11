// =============================================================================
// app/recommendation/components/DivineBackground.tsx
// =============================================================================
// พื้นหลัง Animated Background พร้อมหมอกเรืองแสงและประกายดาวลอย
//
// ความสามารถหลัก:
//   - แสดงรูปภาพ Carousel ด้านหลังพร้อมเอฟเฟกต์ Fade Transition
//   - แสดงก้อนแสงสีทองและสีแดง (MovingBlobs) ลอยไปมาอย่างช้าๆ
//   - แสดงอนุภาคทองคำลอยขึ้นด้านบน (FloatingSparks)
//   - แยกลักษณะเอฟเฟกต์ออกเป็น Sub-components เพื่อความสะอาดและเป็นระเบียบ
// =============================================================================

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MysticalMandala from './MysticalMandala';

// =============================================================================
// Types
// =============================================================================

interface DivineBackgroundProps {
  currentBgIndex: number;
  backgrounds: string[];
}

// =============================================================================
// Sub-Component: MovingBlobs
// =============================================================================

function MovingBlobs() {
  return (
    <>
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -40, 80, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        style={{ willChange: 'transform' }}
        className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-amber-600/10 blur-[120px] rounded-full"
      />
      <motion.div
        animate={{
          x: [0, -80, 40, 0],
          y: [0, 80, -40, 0],
          scale: [1, 1.05, 0.9, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{ willChange: 'transform' }}
        className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-800/15 blur-[100px] rounded-full"
      />
    </>
  );
}

// =============================================================================
// Sub-Component: FloatingSparks
// =============================================================================

function FloatingSparks() {
  const particles = useMemo(() => {
    return [...Array(30)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 50 + 50}%`,
      delay: Math.random() * 10,
      duration: Math.random() * 8 + 8,
      x: (Math.random() - 0.5) * 60,
    }));
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={`spark-${i}`}
          initial={{ left: p.left, top: p.top, opacity: 0, scale: 0 }}
          animate={{
            y: [0, -400],
            x: [0, p.x],
            opacity: [0, 0.7, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
          style={{ willChange: 'transform, opacity' }}
          className="absolute w-1 h-1 bg-faith-gold rounded-full shadow-[0_0_12px_#D4AF37]"
        />
      ))}
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function DivineBackground({ currentBgIndex, backgrounds }: DivineBackgroundProps) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#1A0404]">
      {/* Background Image Carousel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBgIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgrounds[currentBgIndex]})` }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-b from-[#1A0404] via-[#1A0404]/80 to-[#1A0404]" />

      {/* Atmospheric Effects */}
      <MovingBlobs />
      <FloatingSparks />
      <MysticalMandala />
    </div>
  );
}

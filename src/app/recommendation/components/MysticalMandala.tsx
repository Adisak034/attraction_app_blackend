// =============================================================================
// app/recommendation/components/MysticalMandala.tsx
// =============================================================================
// วงล้อแมนดะลาเรืองแสงหมุนเป็นพื้นหลังสำหรับตกแต่งหน้าแอปสายมู
//
// ความสามารถหลัก:
//   - แบ่งวงล้อเรขาคณิตออกเป็น 3 ชั้น (Outer, Middle, Inner) ให้หมุนสลับทิศทางกัน
//   - แยก Sub-components วงล้อแต่ละชั้นออกจากกันเพื่อให้โครงสร้างโค้ดสะอาดและอ่านง่าย
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

// =============================================================================
// Sub-Component: OuterMandalaRing
// =============================================================================

function OuterMandalaRing() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      className="absolute w-[800px] h-[800px] border border-faith-gold/30 rounded-full flex items-center justify-center"
    >
      <div className="absolute w-[90%] h-[90%] border border-faith-gold/20 rounded-full border-dashed" />
      {[...Array(12)].map((_, i) => (
        <div
          key={`outer-${i}`}
          className="absolute w-4 h-4 bg-faith-gold/40 rounded-full"
          style={{ transform: `rotate(${i * 30}deg) translate(400px)` }}
        />
      ))}
    </motion.div>
  );
}

// =============================================================================
// Sub-Component: MiddleMandalaRing
// =============================================================================

function MiddleMandalaRing() {
  return (
    <motion.div
      animate={{ rotate: -360 }}
      transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
      className="absolute w-[600px] h-[600px] border border-faith-gold/30 rounded-full flex items-center justify-center"
    >
      {[...Array(8)].map((_, i) => (
        <div
          key={`middle-${i}`}
          className="absolute w-32 h-32 border border-faith-gold/20 rounded-full"
          style={{ transform: `rotate(${i * 45}deg) translate(150px)` }}
        />
      ))}
    </motion.div>
  );
}

// =============================================================================
// Sub-Component: InnerMandalaRing
// =============================================================================

function InnerMandalaRing() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      className="absolute w-[400px] h-[400px] border border-faith-gold/30 rounded-full flex items-center justify-center opacity-50"
    >
      <div className="w-full h-full border-4 border-faith-gold/10 rounded-full" />
      {[...Array(6)].map((_, i) => (
        <Star
          key={`inner-${i}`}
          size={24}
          className="absolute text-faith-gold/40"
          style={{ transform: `rotate(${i * 60}deg) translate(200px) rotate(-${i * 60}deg)` }}
        />
      ))}
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function MysticalMandala() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-20">
      <OuterMandalaRing />
      <MiddleMandalaRing />
      <InnerMandalaRing />
    </div>
  );
}

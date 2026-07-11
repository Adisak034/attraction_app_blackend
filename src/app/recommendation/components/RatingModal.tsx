// =============================================================================
// app/recommendation/components/RatingModal.tsx
// =============================================================================
// หน้าต่าง Modal สำหรับให้คะแนนสถานที่ (Work, Finance, Love)
// พร้อมปุ่มดาว Interactive (StarRating)
//
// ความสามารถหลัก:
//   - รับคะแนนดาวแยก 3 ด้าน (การงาน, การเงิน, ความรัก)
//   - บันทึกข้อมูลไปยัง API (/api/rating)
//   - แยก Sub-components: CategoryRatingRow, RatingModalHeader, RatingModalFooter
// =============================================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Star, X } from 'lucide-react';
import { apiPost } from '@/lib/apiClient';

// =============================================================================
// Sub-Component: StarRating
// =============================================================================

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
}

export function StarRating({ value, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={`star-${star}`}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-125 focus:outline-none p-1"
        >
          <Star
            size={28}
            className={`transition-colors ${
              star <= (hovered || value) ? 'text-faith-gold fill-faith-gold' : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Sub-Component: CategoryRatingRow
// =============================================================================

interface CategoryRatingRowProps {
  label: string;
  icon: string;
  value: number;
  onChange: (v: number) => void;
}

function CategoryRatingRow({ label, icon, value, onChange }: CategoryRatingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 w-24 shrink-0">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-bold text-white">{label}</span>
      </div>
      <StarRating value={value} onChange={onChange} />
    </div>
  );
}

// =============================================================================
// Sub-Component: RatingModalHeader
// =============================================================================

interface RatingModalHeaderProps {
  placeName: string;
}

function RatingModalHeader({ placeName }: RatingModalHeaderProps) {
  return (
    <div className="text-center mb-8">
      <div className="w-16 h-16 bg-faith-gold/20 border border-faith-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Star className="text-faith-gold fill-faith-gold" size={32} />
      </div>
      <h3 className="text-2xl font-black text-white gold-gradient-text mb-1">ให้คะแนนสถานที่</h3>
      <p className="text-gray-400 text-sm">{placeName}</p>
      <p className="text-gray-500 text-xs mt-2">ให้คะแนนในหมวดที่ต้องการ (ไม่บังคับทุกหมวด)</p>
    </div>
  );
}

// =============================================================================
// Sub-Component: RatingModalActions
// =============================================================================

interface RatingModalActionsProps {
  hasAny: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onSkip: () => void;
}

function RatingModalActions({ hasAny, submitting, onSubmit, onSkip }: RatingModalActionsProps) {
  return (
    <>
      <motion.button
        type="button"
        whileHover={hasAny ? { scale: 1.02 } : {}}
        whileTap={hasAny ? { scale: 0.98 } : {}}
        onClick={onSubmit}
        disabled={!hasAny || submitting}
        className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
          hasAny
            ? 'bg-faith-gold text-[#1A0404] shadow-lg shadow-amber-700/30 hover:bg-amber-400'
            : 'bg-white/10 text-gray-500 cursor-not-allowed'
        }`}
      >
        {submitting ? (
          <Loader2 className="animate-spin" size={22} />
        ) : (
          <>
            <Star size={20} />
            <span>ส่งคะแนน</span>
          </>
        )}
      </motion.button>

      <button
        type="button"
        onClick={onSkip}
        className="w-full mt-3 py-3 rounded-2xl text-gray-500 hover:text-gray-300 text-sm font-bold transition-colors"
      >
        ข้ามขั้นตอนนี้
      </button>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface RatingModalProps {
  place: { id: string; name: string };
  userId: string;
  onSubmit: (ratings: { work: number; finance: number; love: number }) => void;
  onClose: () => void;
}

export default function RatingModal({ place, userId, onSubmit, onClose }: RatingModalProps) {
  const [work, setWork] = useState(0);
  const [finance, setFinance] = useState(0);
  const [love, setLove] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const hasAny = work > 0 || finance > 0 || love > 0;

  const handleSubmit = async () => {
    if (!hasAny) return;
    setSubmitting(true);
    try {
      await apiPost('/api/rating', {
        user_id: Number(userId),
        attraction_id: Number(place.id),
        rating_work: work,
        rating_finance: finance,
        rating_love: love,
      });
    } catch (e) {
      console.error('Rating save failed:', e);
    } finally {
      setSubmitting(false);
      onSubmit({ work, finance, love });
    }
  };

  const categories = [
    { label: 'การงาน', icon: '💼', value: work, onChange: setWork },
    { label: 'การเงิน', icon: '💰', value: finance, onChange: setFinance },
    { label: 'ความรัก', icon: '❤️', value: love, onChange: setLove },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-[#1A0404] border border-faith-gold/40 rounded-[2rem] w-full max-w-md p-8 relative shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <RatingModalHeader placeName={place.name} />

        <div className="space-y-6 mb-8">
          {categories.map(({ label, icon, value, onChange }) => (
            <CategoryRatingRow key={label} label={label} icon={icon} value={value} onChange={onChange} />
          ))}
        </div>

        <RatingModalActions hasAny={hasAny} submitting={submitting} onSubmit={handleSubmit} onSkip={onClose} />
      </motion.div>
    </motion.div>
  );
}

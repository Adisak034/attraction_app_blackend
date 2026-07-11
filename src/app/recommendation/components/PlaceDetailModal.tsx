// =============================================================================
// components/PlaceDetailModal.tsx
// =============================================================================
// หน้าต่าง Modal สำหรับแสดงรายละเอียดเชิงลึกของสถานที่แบบเดี่ยว
//
// ความสามารถหลัก:
//   - แสดงรูปภาพสถานที่ (พร้อม Fallback กรณีรูปโหลดไม่ขึ้น)
//   - แสดงชื่อ หมวดหมู่ และคะแนนความเข้ากัน (Score)
//   - ข้อมูลเจาะลึก: สิ่งศักดิ์สิทธิ์ประจำสถานที่ และ ของไหว้ที่แนะนำ
//   - แสดงพิกัดบนแผนที่จำลอง (Google Maps Embed ย่อส่วน ป้องกันการลากเลื่อน)
//   - ปุ่มเปิด Google Maps ตัวเต็ม เพื่อเริ่มการเดินทาง
// =============================================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, Sparkles, Star, X } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface Recommendation {
  id: string;
  name: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
  score: number;
  image?: string;
  sacred_object?: string;
  offerings?: string;
}

interface PlaceDetailModalProps {
  selectedPlace: Recommendation;
  isNewUser?: boolean;
  onClose: () => void;
  onOpenMap: (place: Recommendation) => void;
}

// =============================================================================
// Sub-Component: DetailInfoCard
// =============================================================================

interface DetailInfoCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function DetailInfoCard({ icon, title, children }: DetailInfoCardProps) {
  return (
    <div className="bg-[#2D0A0A] border border-white/15 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2 sm:mb-3 text-faith-gold">
        {icon}
        <span className="font-black text-xl sm:text-2xl">{title}</span>
      </div>
      <div className="text-white text-sm sm:text-base leading-snug">{children}</div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function PlaceDetailModal({
  selectedPlace,
  isNewUser,
  onClose,
  onOpenMap,
}: PlaceDetailModalProps) {
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());

  const categoryChips = [
    selectedPlace.type,
    ...selectedPlace.category
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  ].slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#1A0404] border border-faith-gold/30 rounded-3xl max-w-md w-full h-auto max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto desktop-no-scrollbar relative shadow-2xl pb-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2.5 bg-black/50 rounded-full text-gray-300 hover:text-white transition-colors z-20"
        >
          <X size={24} />
        </button>

        {/* Cover Image & Header Title */}
        <div className="relative h-44 sm:h-52">
          {selectedPlace.image && !brokenImageIds.has(selectedPlace.id) ? (
            <img
              src={selectedPlace.image}
              alt={selectedPlace.name}
              className="w-full h-full object-cover"
              onError={() => {
                setBrokenImageIds((prev) => {
                  const next = new Set(prev);
                  next.add(selectedPlace.id);
                  return next;
                });
              }}
            />
          ) : (
            <div className="w-full h-full bg-faith-gold/10 flex items-center justify-center">
              <span className="text-faith-gold/30 font-black text-4xl">NO IMAGE</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A0404] via-[#1A0404]/35 to-transparent" />

          <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10">
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              {categoryChips.map((chip, index) => (
                <span
                  key={`${chip}-${index}`}
                  className="px-2.5 sm:px-3 py-1 bg-faith-gold/85 text-[#1A0404] text-[10px] sm:text-xs font-black rounded-lg sm:rounded-xl tracking-wide"
                >
                  {chip}
                </span>
              ))}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-lg line-clamp-2">
              {selectedPlace.name}
            </h2>
          </div>
        </div>

        {/* Detailed Info Cards Body */}
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
          <div className="bg-[#2D0A0A] border border-white/15 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2 sm:mb-3 text-faith-gold">
              <Star size={18} fill="currentColor" />
              <span className="font-black text-base sm:text-lg">
                {isNewUser ? 'คะแนนความนิยม' : 'คะแนนความเข้ากัน'}
              </span>
            </div>
            <span className="text-3xl sm:text-4xl font-black text-white leading-none">
              {selectedPlace.score.toFixed(2)}
            </span>
          </div>

          <DetailInfoCard icon={<Sparkles size={18} />} title="สิ่งศักดิ์สิทธิ์">
            {selectedPlace.sacred_object || 'ไม่ระบุข้อมูล'}
          </DetailInfoCard>

          <DetailInfoCard icon={<Heart size={18} />} title="ของไหว้">
            {selectedPlace.offerings || 'ไม่ระบุข้อมูล'}
          </DetailInfoCard>

          {/* Google Maps Preview Embed Box (locked pointer events) */}
          <div className="w-full h-44 sm:h-48 rounded-2xl overflow-hidden border border-white/20 bg-[#1A0404] relative select-none">
            <div className="absolute inset-0 z-10 bg-transparent" />
            <iframe
              title="Place map preview"
              src={`https://maps.google.com/maps?q=${selectedPlace.lat},${selectedPlace.lng}&hl=th&z=15&output=embed`}
              width="100%"
              height="100%"
              className="pointer-events-none"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Navigation Open Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onOpenMap(selectedPlace)}
            className="flex items-center justify-center gap-2 w-full py-3.5 sm:py-4 bg-faith-gold text-[#1A0404] font-black rounded-2xl hover:bg-amber-400 transition-colors text-sm sm:text-lg"
          >
            <MapPin size={18} />
            <span>เปิดในแผนที่ GOOGLE MAPS</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

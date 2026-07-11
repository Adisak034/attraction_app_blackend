// =============================================================================
// app/recommendation/components/RecommendationList.tsx
// =============================================================================
// แสดงผลรายการแนะนำสถานที่แยกตามหมวดหมู่ (ความรัก, การเงิน, การงาน)
//
// ความสามารถหลัก:
//   - กรองและเรียงลำดับสถานที่แนะนำตามคะแนน (score) สูงไปต่ำในแต่ละหมวด
//   - แยก Sub-components: RecommendationCard, CategorySection, ErrorStateBox
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Coins, Heart, Loader2, Sparkles, Star } from 'lucide-react';

// =============================================================================
// Types & Constants
// =============================================================================

export interface Recommendation {
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

const CATEGORY_FILTER_ALIASES: Record<'LOVE' | 'WEALTH' | 'CAREER', string[]> = {
  LOVE: ['ความรัก'],
  WEALTH: ['โชคลาภ', 'การเงิน'],
  CAREER: ['การงาน'],
};

// =============================================================================
// Sub-Component: ErrorStateBox
// =============================================================================

interface ErrorStateBoxProps {
  error: string;
  loading: boolean;
  onRetry: () => void;
}

function ErrorStateBox({ error, loading, onRetry }: ErrorStateBoxProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-20 h-20 bg-red-950/50 rounded-full flex items-center justify-center mb-6 border border-red-800/50">
        <span className="text-4xl">⚠️</span>
      </div>
      <h3 className="text-2xl font-black text-white mb-3">ไม่สามารถโหลดคำแนะนำได้</h3>
      <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">{error}</p>
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRetry}
        disabled={loading}
        className="bg-faith-gold hover:bg-amber-400 text-[#1A0404] px-10 py-4 rounded-full font-black text-base shadow-lg flex items-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
        <span>ลองใหม่อีกครั้ง</span>
      </motion.button>
    </motion.div>
  );
}

// =============================================================================
// Sub-Component: RecommendationCard
// =============================================================================

interface RecommendationCardProps {
  item: Recommendation;
  index: number;
  isNewUser: boolean;
  isBroken: boolean;
  onImageError: (id: string) => void;
  onSelectPlace: (place: Recommendation) => void;
}

function RecommendationCard({
  item,
  index,
  isNewUser,
  isBroken,
  onImageError,
  onSelectPlace,
}: RecommendationCardProps) {
  const subtitle =
    item.sacred_object && item.sacred_object !== '-'
      ? `สิ่งศักดิ์สิทธิ์: ${item.sacred_object}`
      : item.offerings && item.offerings !== '-'
      ? `ของไหว้: ${item.offerings}`
      : 'สถานที่ศักดิ์สิทธิ์ที่เปี่ยมไปด้วยสิริมงคลและพลังวิเศษ';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -10, boxShadow: '0 25px 50px -12px rgba(212,175,55,0.25)' }}
      className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] glass-card rounded-[2rem] overflow-hidden flex flex-col border border-white/10 hover:border-faith-gold/50 cursor-pointer transition-all"
      onClick={() => onSelectPlace(item)}
    >
      {/* Cover Image Box */}
      <div className="h-56 relative overflow-hidden group/img">
        {item.image && !isBroken ? (
          <img
            src={item.image}
            alt={item.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
            onError={() => onImageError(item.id)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white/70 text-sm font-bold tracking-wider">
            NO IMAGE
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A0404] via-[#1A0404]/40 to-transparent" />
      </div>

      {/* Card Body */}
      <div className="p-6 flex-1 flex flex-col">
        <h4 className="text-xl font-black text-white mb-3 line-clamp-1 group-hover:text-faith-gold transition-colors">
          {item.name}
        </h4>

        {/* Score Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-faith-gold/20 rounded border border-faith-gold/30">
            <Star size={12} className="text-faith-gold fill-faith-gold" />
          </div>
          <span className="text-sm font-bold text-gray-300 tracking-wider font-mono">
            {item.score.toFixed(1)}{' '}
            {!isNewUser && (
              <span className="text-gray-500 font-sans tracking-normal font-medium text-xs ml-1">
                (คะแนนความเข้ากัน)
              </span>
            )}
          </span>
        </div>

        {/* Sacred Object / Offerings Summary */}
        <p className="text-sm text-gray-400 mb-8 flex-1 line-clamp-2 leading-relaxed font-light">{subtitle}</p>

        {/* CTA Button */}
        <button
          type="button"
          className="w-full bg-white/5 hover:bg-faith-gold text-white hover:text-[#1A0404] py-4 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-transparent group/btn mt-auto"
        >
          <Sparkles size={16} className="text-faith-gold group-hover/btn:text-[#1A0404]" />
          <span>รับเส้นทางการเดินทาง</span>
        </button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Sub-Component: CategorySection
// =============================================================================

interface CategorySectionProps {
  categoryLabel: 'ความรัก' | 'การเงิน' | 'การงาน';
  recommendations: Recommendation[];
  isNewUser: boolean;
  brokenImageIds: Set<string>;
  onImageError: (id: string) => void;
  onSelectPlace: (place: Recommendation) => void;
}

function CategorySection({
  categoryLabel,
  recommendations,
  isNewUser,
  brokenImageIds,
  onImageError,
  onSelectPlace,
}: CategorySectionProps) {
  const aliases =
    CATEGORY_FILTER_ALIASES[
      categoryLabel === 'ความรัก' ? 'LOVE' : categoryLabel === 'การเงิน' ? 'WEALTH' : 'CAREER'
    ];

  const filteredItems = recommendations
    .filter((item) => aliases.some((label) => item.category.includes(label)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (filteredItems.length === 0) return null;

  return (
    <div className="w-full mb-12">
      <h4 className="text-2xl md:text-3xl font-black text-faith-gold mb-6 uppercase tracking-tight flex items-center gap-3">
        {categoryLabel === 'ความรัก' && <Heart size={32} className="text-faith-gold fill-faith-gold" />}
        {categoryLabel === 'การเงิน' && <Coins size={32} className="text-faith-gold" />}
        {categoryLabel === 'การงาน' && <Briefcase size={32} className="text-faith-gold" />}
        <span>{categoryLabel}</span>
      </h4>

      <div className="flex flex-wrap justify-center gap-6">
        {filteredItems.map((item, index) => (
          <RecommendationCard
            key={item.id}
            item={item}
            index={index}
            isNewUser={isNewUser}
            isBroken={brokenImageIds.has(item.id)}
            onImageError={onImageError}
            onSelectPlace={onSelectPlace}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface RecommendationListProps {
  recommendations: Recommendation[];
  isNewUser: boolean;
  error: string;
  loading: boolean;
  brokenImageIds: Set<string>;
  onImageError: (id: string) => void;
  onSelectPlace: (place: Recommendation) => void;
  onRetry: () => void;
}

export default function RecommendationList({
  recommendations,
  isNewUser,
  error,
  loading,
  brokenImageIds,
  onImageError,
  onSelectPlace,
  onRetry,
}: RecommendationListProps) {
  if (error) {
    return <ErrorStateBox error={error} loading={loading} onRetry={onRetry} />;
  }

  const categories = ['ความรัก', 'การเงิน', 'การงาน'] as const;

  return (
    <>
      {categories.map((catLabel) => (
        <CategorySection
          key={catLabel}
          categoryLabel={catLabel}
          recommendations={recommendations}
          isNewUser={isNewUser}
          brokenImageIds={brokenImageIds}
          onImageError={onImageError}
          onSelectPlace={onSelectPlace}
        />
      ))}
    </>
  );
}

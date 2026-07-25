// =============================================================================
// app/admin/page.tsx
// =============================================================================
// หน้า Dashboard หลักของ Admin (/admin)
// แสดงสถิติภาพรวมและลิงก์ไปยังหน้าจัดการต่าง ๆ
//
// ความสามารถหลัก:
//   - ดึงข้อมูลสถิติจาก API พร้อมกัน (attractions, users, ratings)
//   - แสดง Stat Cards: จำนวนสถานที่, ผู้ใช้, รูปภาพ, คะแนนรีวิว
//   - แสดง Rating Distribution (progress bar) แยก Work/Finance/Love
//   - แสดง Attractions by Category (bar chart แบบ progress bar)
//   - Management Sections: ลิงก์การ์ดไปยัง 6 หน้าจัดการ
//
// API ที่เรียก:
//   GET /api/attraction - ดึงสถานที่ทั้งหมด
//   GET /api/users      - ดึงผู้ใช้ทั้งหมด
//   GET /api/rating     - ดึง rating ทั้งหมด
// =============================================================================

import React, { useEffect, useState } from 'react';
import { Activity, Brain, ImageIcon, MapIcon, Star, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/apiClient';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface Stats {
  total_attractions: number;
  total_users: number;
  total_images: number;
  total_ratings: number;
  rating_work_avg: number;
  rating_finance_avg: number;
  rating_love_avg: number;
}

interface AttractionCategory {
  category_name: string;
  count: number;
}

interface AttractionRow {
  attraction_id: number;
  attraction_name: string;
  attraction_image?: string | null;
  categories?: string | null;
}

interface RatingRow {
  rating_id: number;
  rating_work?: number;
  rating_finance?: number;
  rating_love?: number;
}


// =============================================================================
// Helper Functions (Single Responsibility: Aggregation & Statistics)
// =============================================================================

/** คำนวณข้อมูลสถิติภาพรวมจากข้อมูล raw attractions, users, และ ratings */
function calculateDashboardStats(
  attractions: AttractionRow[],
  users: unknown[],
  ratings: RatingRow[]
): { stats: Stats; categoryStats: AttractionCategory[] } {
  const total_attractions = attractions.length;
  const total_users = users.length;
  const total_ratings = ratings.length;
  const total_images = attractions.filter((a) => Boolean(a.attraction_image)).length;

  // นับสถานที่ตามหมวดหมู่ (Split ด้วย comma)
  const categoryMap = new Map<string, number>();
  attractions.forEach((row) => {
    const rawCategories = row.categories || '';
    const parts = rawCategories
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      categoryMap.set('Uncategorized', (categoryMap.get('Uncategorized') || 0) + 1);
      return;
    }

    parts.forEach((categoryName) => {
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
    });
  });

  const categoryStats: AttractionCategory[] = Array.from(categoryMap.entries())
    .map(([category_name, count]) => ({ category_name, count }))
    .sort((a, b) => b.count - a.count);

  // คำนวณคะแนนเฉลี่ย Work, Finance, และ Love
  let rating_work_avg = 0;
  let rating_finance_avg = 0;
  let rating_love_avg = 0;

  if (total_ratings > 0) {
    const sum_work = ratings.reduce((acc, r) => acc + (r.rating_work || 0), 0);
    const sum_finance = ratings.reduce((acc, r) => acc + (r.rating_finance || 0), 0);
    const sum_love = ratings.reduce((acc, r) => acc + (r.rating_love || 0), 0);

    rating_work_avg = parseFloat((sum_work / total_ratings).toFixed(2));
    rating_finance_avg = parseFloat((sum_finance / total_ratings).toFixed(2));
    rating_love_avg = parseFloat((sum_love / total_ratings).toFixed(2));
  }

  return {
    stats: {
      total_attractions,
      total_users,
      total_images,
      total_ratings,
      rating_work_avg,
      rating_finance_avg,
      rating_love_avg,
    },
    categoryStats,
  };
}


// =============================================================================
// Sub-Components (UI Modularization)
// =============================================================================

interface StatCardsGridProps {
  stats: Stats;
}

function StatCardsGrid({ stats }: StatCardsGridProps) {
  const cards = [
    { label: 'Total Attractions', value: stats.total_attractions, icon: MapIcon, borderColor: 'border-blue-500', iconColor: 'text-blue-500' },
    { label: 'Total Users', value: stats.total_users, icon: Users, borderColor: 'border-green-500', iconColor: 'text-green-500' },
    { label: 'Total Images', value: stats.total_images, icon: ImageIcon, borderColor: 'border-purple-500', iconColor: 'text-purple-500' },
    { label: 'Total Ratings', value: stats.total_ratings, icon: Star, borderColor: 'border-yellow-500', iconColor: 'text-yellow-500' },
  ];

  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Site Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${card.borderColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <Icon className={`w-12 h-12 ${card.iconColor} opacity-20`} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface RatingDistributionCardProps {
  stats: Stats;
}

function RatingDistributionCard({ stats }: RatingDistributionCardProps) {
  const bars = [
    { label: 'Work Rating', avg: stats.rating_work_avg, barColor: 'bg-blue-500', textColor: 'text-blue-600' },
    { label: 'Finance Rating', avg: stats.rating_finance_avg, barColor: 'bg-green-500', textColor: 'text-green-600' },
    { label: 'Love Rating', avg: stats.rating_love_avg, barColor: 'bg-red-500', textColor: 'text-red-600' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Rating Distribution</h3>
      <div className="space-y-4">
        {bars.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className={`text-sm font-semibold ${item.textColor}`}>{item.avg.toFixed(1)} ★</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${item.barColor} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(100, Math.max(0, (item.avg / 5) * 100))}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CategoryProgressCardProps {
  categoryStats: AttractionCategory[];
  loading: boolean;
}

function CategoryProgressCard({ categoryStats, loading }: CategoryProgressCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Attractions by Category</h3>
      {loading ? (
        <div className="flex items-center justify-center h-40 bg-gray-100 rounded text-gray-500 font-medium">
          <p>Loading chart data...</p>
        </div>
      ) : categoryStats.length === 0 ? (
        <div className="flex items-center justify-center h-40 bg-gray-100 rounded text-gray-500 font-medium">
          <p>No category data available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categoryStats.slice(0, 8).map((item) => {
            const maxCount = Math.max(...categoryStats.map((x) => x.count), 1);
            const widthPercent = (item.count / maxCount) * 100;
            return (
              <div key={item.category_name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 truncate pr-3">{item.category_name}</span>
                  <span className="text-sm font-semibold text-indigo-600">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${widthPercent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ManagementSectionsGridProps {
  onNavigate: (href: string) => void;
}

function ManagementSectionsGrid({ onNavigate }: ManagementSectionsGridProps) {
  const sections = [
    { title: 'Attractions', href: '/admin/attractions', icon: MapIcon, color: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Users', href: '/admin/users', icon: Users, color: 'bg-green-50', textColor: 'text-green-600' },
    { title: 'Images', href: '/admin/images', icon: ImageIcon, color: 'bg-purple-50', textColor: 'text-purple-600' },
    { title: 'Ratings', href: '/admin/ratings', icon: Star, color: 'bg-yellow-50', textColor: 'text-yellow-600' },
    { title: 'User Log', href: '/admin/activity-logs', icon: Activity, color: 'bg-indigo-50', textColor: 'text-indigo-600' },
  ];

  return (
    <section>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Management Sections</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.title}
              onClick={() => onNavigate(section.href)}
              className={`${section.color} p-6 rounded-lg hover:shadow-lg transition-all duration-200 text-left border border-transparent hover:border-black/5`}
            >
              <div className="flex items-center mb-4">
                <Icon className={`${section.textColor} w-8 h-8`} />
              </div>
              <h3 className={`text-lg font-semibold ${section.textColor} mb-2`}>{section.title}</h3>
              <p className="text-gray-600 text-sm">Manage {section.title.toLowerCase()}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}


// =============================================================================
// Main Component
// =============================================================================

export default function AdminPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({
    total_attractions: 0,
    total_users: 0,
    total_images: 0,
    total_ratings: 0,
    rating_work_avg: 0,
    rating_finance_avg: 0,
    rating_love_avg: 0,
  });
  const [categoryStats, setCategoryStats] = useState<AttractionCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [attractionsRaw, usersRaw, ratingsRaw] = await Promise.all([
          apiGet('/api/attraction'),
          apiGet('/api/users'),
          apiGet('/api/rating'),
        ]);

        const attractions = Array.isArray(attractionsRaw) ? (attractionsRaw as AttractionRow[]) : [];
        const users = Array.isArray(usersRaw) ? (usersRaw as unknown[]) : [];
        const ratings = Array.isArray(ratingsRaw) ? (ratingsRaw as RatingRow[]) : [];

        const { stats: calculatedStats, categoryStats: calculatedCategoryStats } = calculateDashboardStats(
          attractions,
          users,
          ratings
        );

        setStats(calculatedStats);
        setCategoryStats(calculatedCategoryStats);
      } catch (err) {
        console.error('Failed to fetch dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {/* Section 1: Site Statistics Cards */}
      <StatCardsGrid stats={stats} />

      {/* Section 2: Charts & Rating Distribution */}
      <section className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RatingDistributionCard stats={stats} />
        <CategoryProgressCard categoryStats={categoryStats} loading={loading} />
      </section>

      {/* Section 3: Management Menu Navigation */}
      <ManagementSectionsGrid onNavigate={navigate} />
    </div>
  );
}

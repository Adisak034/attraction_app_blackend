import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapIcon, Users, ImageIcon, Star, Activity, BarChart3 } from 'lucide-react';
import { apiGet } from '@/lib/apiClient';

interface Stats {
  total_attractions: number;
  total_users: number;
  total_images: number;
  total_ratings: number;
  rating_work_avg: number;
  rating_finance_avg: number;
  rating_love_avg: number;
}

interface RatingData {
  rating_id: number;
  rating_work: number;
  rating_finance: number;
  rating_love: number;
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
  const [loading, setLoading] = useState(true);
  const [categoryStats, setCategoryStats] = useState<AttractionCategory[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch data from all endpoints to calculate statistics
        const [attractions, users, ratings] = await Promise.all([
          apiGet('/api/attraction'),
          apiGet('/api/users'),
          apiGet('/api/rating'),
        ]);

        const attractionRows: AttractionRow[] = Array.isArray(attractions) ? attractions : [];

        // Calculate statistics
        let total_attractions = attractionRows.length || 0;
        let total_users = users.length || 0;
        let total_ratings = ratings.length || 0;
        
        // Count images (from attraction_image field)
        const total_images = attractionRows.filter((a) => a.attraction_image).length || 0;

        // Calculate attractions by category
        const categoryMap = new Map<string, number>();
        attractionRows.forEach((row) => {
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

        const sortedCategoryStats: AttractionCategory[] = Array.from(categoryMap.entries())
          .map(([category_name, count]) => ({ category_name, count }))
          .sort((a, b) => b.count - a.count);

        setCategoryStats(sortedCategoryStats);

        // Calculate average ratings
        let avg_work = 0, avg_finance = 0, avg_love = 0;
        if (total_ratings > 0) {
          const sum_work = ratings.reduce((acc: number, r: any) => acc + (r.rating_work || 0), 0);
          const sum_finance = ratings.reduce((acc: number, r: any) => acc + (r.rating_finance || 0), 0);
          const sum_love = ratings.reduce((acc: number, r: any) => acc + (r.rating_love || 0), 0);
          avg_work = parseFloat((sum_work / total_ratings).toFixed(2));
          avg_finance = parseFloat((sum_finance / total_ratings).toFixed(2));
          avg_love = parseFloat((sum_love / total_ratings).toFixed(2));
        }

        setStats({
          total_attractions,
          total_users,
          total_images,
          total_ratings,
          rating_work_avg: avg_work,
          rating_finance_avg: avg_finance,
          rating_love_avg: avg_love,
        });
      } catch (err) {
        console.error('Failed to fetch statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const managementSections = [
    { title: 'Attractions', href: '/admin/attractions', icon: MapIcon, color: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Users', href: '/admin/users', icon: Users, color: 'bg-green-50', textColor: 'text-green-600' },
    { title: 'Images', href: '/admin/images', icon: ImageIcon, color: 'bg-purple-50', textColor: 'text-purple-600' },
    { title: 'Ratings', href: '/admin/ratings', icon: Star, color: 'bg-yellow-50', textColor: 'text-yellow-600' },
    { title: 'User Log', href: '/admin/activity-logs', icon: Activity, color: 'bg-indigo-50', textColor: 'text-indigo-600' },
  ];

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {/* Site Statistics Section */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Site Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stat Card 1: Attractions */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Attractions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_attractions}</p>
              </div>
              <MapIcon className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          {/* Stat Card 2: Users */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_users}</p>
              </div>
              <Users className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          {/* Stat Card 3: Images */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Images</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_images}</p>
              </div>
              <ImageIcon className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>

          {/* Stat Card 4: Ratings */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Ratings</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_ratings}</p>
              </div>
              <Star className="w-12 h-12 text-yellow-500 opacity-20" />
            </div>
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rating Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Rating Distribution</h3>
          <div className="space-y-4">
            {/* Work Ratings */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Work Rating</span>
                <span className="text-sm font-semibold text-blue-600">{stats.rating_work_avg.toFixed(1)} ★</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.rating_work_avg / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Finance Ratings */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Finance Rating</span>
                <span className="text-sm font-semibold text-green-600">{stats.rating_finance_avg.toFixed(1)} ★</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.rating_finance_avg / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Love Ratings */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Love Rating</span>
                <span className="text-sm font-semibold text-red-600">{stats.rating_love_avg.toFixed(1)} ★</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.rating_love_avg / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Attractions by Category */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Attractions by Category</h3>
          {loading ? (
            <div className="flex items-center justify-center h-40 bg-gray-100 rounded text-gray-500">
              <p>Loading chart...</p>
            </div>
          ) : categoryStats.length === 0 ? (
            <div className="flex items-center justify-center h-40 bg-gray-100 rounded text-gray-500">
              <p>No category data</p>
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
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${widthPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Management Sections */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Management Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {managementSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.title}
                onClick={() => navigate(section.href)}
                className={`${section.color} p-6 rounded-lg hover:shadow-lg transition-shadow duration-200 text-left`}
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
    </div>
  );
}

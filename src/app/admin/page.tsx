'use client';

import Link from 'next/link';
import { ShieldCheck, Users, Map, ImageIcon, Star, BarChart3, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const adminSections = [
  {
    name: 'Attractions',
    href: '/admin/attractions',
    description: 'Manage attractions and their categories.',
    icon: Map,
  },
  {
    name: 'Users',
    href: '/admin/users',
    description: 'View and manage user accounts.',
    icon: Users,
  },
  {
    name: 'Images',
    href: '/admin/images',
    description: 'Add or remove attraction images.',
    icon: ImageIcon,
  },
  {
    name: 'Ratings',
    href: '/admin/ratings',
    description: 'View and moderate user ratings.',
    icon: Star,
  },
];

interface Stats {
    attractions: number;
    users: number;
    ratings: number;
    categories: number;
}

const StatCard = ({ title, value, icon: Icon }: { title: string, value: number, icon: React.ElementType }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center">
        <div className="p-3 bg-blue-100 rounded-full mr-4">
            <Icon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);


export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [attractionsRes, usersRes, ratingsRes, categoriesRes] = await Promise.all([
          fetch('/api/attraction'),
          fetch('/api/users'),
          fetch('/api/rating'),
          fetch('/api/category'),
        ]);

        if (!attractionsRes.ok || !usersRes.ok || !ratingsRes.ok || !categoriesRes.ok) {
          throw new Error('Failed to fetch stats');
        }

        const attractions = await attractionsRes.json();
        const users = await usersRes.json();
        const ratings = await ratingsRes.json();
        const categories = await categoriesRes.json();

        setStats({
          attractions: attractions.length,
          users: users.length,
          ratings: ratings.length,
          categories: categories.length,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center mb-6">
          <ShieldCheck className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        </div>
        
        {/* Stats Section */}
        <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2" />
                Site Statistics
            </h2>
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Loading Skeleton */}
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white p-4 rounded-lg shadow-md flex items-center animate-pulse">
                            <div className="p-3 bg-gray-200 rounded-full mr-4 h-12 w-12"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Attractions" value={stats.attractions} icon={Map} />
                    <StatCard title="Total Users" value={stats.users} icon={Users} />
                    <StatCard title="Total Ratings" value={stats.ratings} icon={Star} />
                    <StatCard title="Total Categories" value={stats.categories} icon={ImageIcon} />
                </div>
            )}
        </div>


        <p className="text-gray-600 mb-8">
          Welcome to the admin panel. From here you can manage all aspects of the application data.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Link href={section.href} key={section.name}>
              <div className="group bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-gray-200">
                <div className="flex items-center mb-3">
                  <section.icon className="h-6 w-6 text-blue-500 group-hover:text-blue-600 transition-colors" />
                  <h2 className="text-xl font-semibold text-gray-800 ml-3">{section.name}</h2>
                </div>
                <p className="text-gray-600">{section.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

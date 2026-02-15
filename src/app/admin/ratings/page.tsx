'use client';

import { useState, useEffect } from 'react';

// Interface based on the GET API response
interface Rating {
  rating_id: number;
  rating: number;
  created_at: string;
  user_name: string;
  attraction_name: string;
}

export default function RatingAdminPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rating');
      if (!response.ok) {
        throw new Error('Failed to fetch ratings');
      }
      const data = await response.json();
      setRatings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const handleDelete = async (ratingId: number) => {
    if (!confirm('Are you sure you want to delete this rating?')) {
      return;
    }
    try {
      const response = await fetch(`/api/rating/${ratingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete rating');
      }

      fetchRatings(); // Refresh the list
      alert('Rating deleted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Rating Management</h1>

      <div className="p-4 border rounded-lg shadow-md bg-white">
        <h2 className="text-xl font-semibold mb-2">All Ratings</h2>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">ID</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Attraction</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">User</th>
                  <th className="py-3 px-4 border-b text-center text-sm font-semibold text-gray-600">Rating</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Date</th>
                  <th className="py-3 px-4 border-b text-center text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((rating) => (
                  <tr key={rating.rating_id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm font-medium text-gray-500">{rating.rating_id}</td>
                    <td className="py-2 px-4 border-b text-sm">{rating.attraction_name}</td>
                    <td className="py-2 px-4 border-b text-sm">{rating.user_name}</td>
                    <td className="py-2 px-4 border-b text-sm text-center text-yellow-500 font-semibold">{rating.rating} ★</td>
                    <td className="py-2 px-4 border-b text-sm">{new Date(rating.created_at).toLocaleString()}</td>
                    <td className="py-2 px-4 border-b text-sm text-center">
                      <button
                        onClick={() => handleDelete(rating.rating_id)}
                        className="bg-red-500 text-white px-4 py-1 rounded text-xs font-medium hover:bg-red-600 w-full"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

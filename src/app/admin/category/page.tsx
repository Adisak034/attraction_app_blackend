'use client';

import { useState, useEffect, FormEvent } from 'react';

interface Category {
  id: number;
  name: string;
}

export default function CategoryAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/category');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      alert('Category name cannot be empty');
      return;
    }
    try {
      const response = await fetch('/api/category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: categoryName }),
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      setCategoryName('');
      fetchCategories(); // Refresh the list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Category Management</h1>

      <div className="mb-6 p-4 border rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Add New Category</h2>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Enter category name"
            className="flex-grow p-2 border rounded"
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Add Category
          </button>
        </form>
      </div>

      <div className="p-4 border rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Existing Categories</h2>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <ul className="space-y-2">
            {categories.map((category) => (
              <li key={category.id} className="p-2 border-b">
                {category.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

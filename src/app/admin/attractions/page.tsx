'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Interfaces based on the database schema
interface Attraction {
  attraction_id: number;
  attraction_name: string;
  type_id: number | null;
  district_id: number | null;
  sect_id: number | null;
  lat: number | null;
  lng: number | null;
  sacred_obj: string | null;
  offering: string | null;
  categories: string; // This comes from the GROUP_CONCAT in the GET API
}

interface Category {
  category_id: number;
  category_name: string;
}

interface Type {
    type_id: number;
    type_name: string;
}

interface District {
    district_id: number;
    district_name: string;
}

interface Sect {
    sect_id: number;
    sect_name: string;
}

const initialFormState = {
  attraction_name: '',
  type_id: '',
  district_id: '',
  sect_id: '',
  lat: '',
  lng: '',
  sacred_obj: '',
  offering: '',
  category_ids: [] as number[],
};

export default function AttractionAdminPage() {
  // Data states
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [sects, setSects] = useState<Sect[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form and UI states
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch all necessary data for the page
  const fetchData = async () => {
    try {
      setLoading(true);
      const [attractionsRes, categoriesRes, typesRes, districtsRes, sectsRes] = await Promise.all([
        fetch('/api/attraction'),
        fetch('/api/category'),
        fetch('/api/type'),
        fetch('/api/district'),
        fetch('/api/sect'),
      ]);

      if (!attractionsRes.ok || !categoriesRes.ok || !typesRes.ok || !districtsRes.ok || !sectsRes.ok) {
        throw new Error('Failed to fetch initial data');
      }

      setAttractions(await attractionsRes.json());
      setCategories(await categoriesRes.json());
      setTypes(await typesRes.json());
      setDistricts(await districtsRes.json());
      setSects(await sectsRes.json());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle category checkbox changes
  const handleCategoryChange = (categoryId: number) => {
    setFormData(prev => {
        const newCategoryIds = prev.category_ids.includes(categoryId)
            ? prev.category_ids.filter(id => id !== categoryId)
            : [...prev.category_ids, categoryId];
        return { ...prev, category_ids: newCategoryIds };
    });
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.attraction_name.trim()) {
        alert('Attraction Name is required.');
        return;
    }
    try {
      const response = await fetch('/api/attraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...formData,
            lat: formData.lat ? parseFloat(formData.lat) : null,
            lng: formData.lng ? parseFloat(formData.lng) : null,
            type_id: formData.type_id ? parseInt(formData.type_id, 10) : null,
            district_id: formData.district_id ? parseInt(formData.district_id, 10) : null,
            sect_id: formData.sect_id ? parseInt(formData.sect_id, 10) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create attraction');
      }

      setFormData(initialFormState); // Reset form
      fetchData(); // Refresh data
      alert('Attraction created successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  // Handle delete action
  const handleDelete = async (attractionId: number) => {
    if (!confirm('Are you sure you want to delete this attraction? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`/api/attraction/${attractionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete attraction');
      }

      fetchData(); // Refresh data
      alert('Attraction deleted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Attraction Management</h1>

      {/* Form Section */}
      <div className="mb-8 p-6 border rounded-lg shadow-lg bg-white">
        <h2 className="text-xl font-semibold mb-4">Add New Attraction</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="attraction_name" className="block text-sm font-medium text-gray-700 mb-1">Attraction Name *</label>
            <input type="text" id="attraction_name" name="attraction_name" value={formData.attraction_name} onChange={handleInputChange} required className="w-full p-2 border rounded-md shadow-sm" />
          </div>
          
          {/* Dropdowns */}
          <div>
            <label htmlFor="type_id" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select id="type_id" name="type_id" value={formData.type_id} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm">
              <option value="">Select Type</option>
              {types.map(t => <option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="district_id" className="block text-sm font-medium text-gray-700 mb-1">District</label>
            <select id="district_id" name="district_id" value={formData.district_id} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm">
              <option value="">Select District</option>
              {districts.map(d => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sect_id" className="block text-sm font-medium text-gray-700 mb-1">Sect</label>
            <select id="sect_id" name="sect_id" value={formData.sect_id} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm">
              <option value="">Select Sect</option>
              {sects.map(s => <option key={s.sect_id} value={s.sect_id}>{s.sect_name}</option>)}
            </select>
          </div>

          {/* Coordinates */}
          <div>
            <label htmlFor="lat" className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input type="number" step="any" id="lat" name="lat" value={formData.lat} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm" />
          </div>
          <div>
            <label htmlFor="lng" className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input type="number" step="any" id="lng" name="lng" value={formData.lng} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm" />
          </div>

          {/* Text Areas */}
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="sacred_obj" className="block text-sm font-medium text-gray-700 mb-1">Sacred Objects</label>
            <textarea id="sacred_obj" name="sacred_obj" value={formData.sacred_obj} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md shadow-sm" />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="offering" className="block text-sm font-medium text-gray-700 mb-1">Offerings</label>
            <textarea id="offering" name="offering" value={formData.offering} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md shadow-sm" />
          </div>

          {/* Categories Checkboxes */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-4 border rounded-md max-h-48 overflow-y-auto">
              {categories.map(cat => (
                <label key={cat.category_id} className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={formData.category_ids.includes(cat.category_id)} onChange={() => handleCategoryChange(cat.category_id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">{cat.category_name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2 lg:col-span-3">
            <button type="submit" className="w-full bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold">
              Add Attraction
            </button>
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="p-4 border rounded-lg shadow-md bg-white">
        <h2 className="text-xl font-semibold mb-2">Existing Attractions</h2>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">ID</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Categories</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">District</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Type</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Sect</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Sacred Objects</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Offerings</th>
                  <th className="py-3 px-4 border-b text-center text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attractions.map((attraction) => (
                  <tr key={attraction.attraction_id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm font-medium text-gray-500">{attraction.attraction_id}</td>
                    <td className="py-2 px-4 border-b text-sm">{attraction.attraction_name}</td>
                    <td className="py-2 px-4 border-b text-sm">{attraction.categories || 'N/A'}</td>
                    <td className="py-2 px-4 border-b text-sm">{districts.find(d => d.district_id === attraction.district_id)?.district_name || 'N/A'}</td>
                    <td className="py-2 px-4 border-b text-sm">{types.find(t => t.type_id === attraction.type_id)?.type_name || 'N/A'}</td>
                    <td className="py-2 px-4 border-b text-sm">{sects.find(s => s.sect_id === attraction.sect_id)?.sect_name || 'N/A'}</td>
                    <td className="py-2 px-4 border-b text-sm">{attraction.sacred_obj || 'N/A'}</td>
                    <td className="py-2 px-4 border-b text-sm">{attraction.offering || 'N/A'}</td>
                    <td className="py-2 px-4 border-b text-sm text-center">
                        <div className="flex flex-col gap-2 items-center">
                            <button
                                onClick={() => router.push(`/admin/attractions/edit/${attraction.attraction_id}`)}
                                className="bg-blue-500 text-white px-4 py-1 rounded text-xs font-medium hover:bg-blue-600 w-full"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(attraction.attraction_id)}
                                className="bg-red-500 text-white px-4 py-1 rounded text-xs font-medium hover:bg-red-600 w-full"
                            >
                                Delete
                            </button>
                        </div>
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

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Interfaces (can be shared from a common types file later)
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

interface AttractionFormData {
  attraction_name: string;
  type_id: string;
  district_id: string;
  sect_id: string;
  lat: string;
  lng: string;
  sacred_obj: string;
  offering: string;
  category_ids: number[];
}

export default function EditAttractionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [sects, setSects] = useState<Sect[]>([]);
  
  // Form and UI states
  const [formData, setFormData] = useState<AttractionFormData>({
    attraction_name: '',
    type_id: '',
    district_id: '',
    sect_id: '',
    lat: '',
    lng: '',
    sacred_obj: '',
    offering: '',
    category_ids: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Fetch all dropdown data and the specific attraction data in parallel
        const [attractionRes, categoriesRes, typesRes, districtsRes, sectsRes] = await Promise.all([
          fetch(`/api/attraction/${id}`),
          fetch('/api/category'),
          fetch('/api/type'),
          fetch('/api/district'),
          fetch('/api/sect'),
        ]);

        if (!attractionRes.ok || !categoriesRes.ok || !typesRes.ok || !districtsRes.ok || !sectsRes.ok) {
          throw new Error('Failed to fetch initial data');
        }

        const attractionData = await attractionRes.json();
        setCategories(await categoriesRes.json());
        setTypes(await typesRes.json());
        setDistricts(await districtsRes.json());
        setSects(await sectsRes.json());

        // Populate form with existing data
        setFormData({
          attraction_name: attractionData.attraction_name || '',
          type_id: attractionData.type_id?.toString() || '',
          district_id: attractionData.district_id?.toString() || '',
          sect_id: attractionData.sect_id?.toString() || '',
          lat: attractionData.lat?.toString() || '',
          lng: attractionData.lng?.toString() || '',
          sacred_obj: attractionData.sacred_obj || '',
          offering: attractionData.offering || '',
          category_ids: Array.isArray(attractionData.categories) 
            ? attractionData.categories.map((cat: any) => cat.category_id) 
            : [],
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (categoryId: number) => {
    setFormData(prev => {
        const newCategoryIds = prev.category_ids.includes(categoryId)
            ? prev.category_ids.filter(id => id !== categoryId)
            : [...prev.category_ids, categoryId];
        return { ...prev, category_ids: newCategoryIds };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.attraction_name.trim()) {
        alert('Attraction Name is required.');
        return;
    }
    try {
      const response = await fetch(`/api/attraction/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(errorData.message || 'Failed to update attraction');
      }

      alert('Attraction updated successfully!');
      router.push('/admin/attractions');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  if (loading) return <p className="text-center p-8">Loading...</p>;
  if (error) return <p className="text-center text-red-500 p-8">Error: {error}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Attraction</h1>

      <div className="p-6 border rounded-lg shadow-lg bg-white">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Form fields are identical to the add form, just pre-populated */}
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="attraction_name" className="block text-sm font-medium text-gray-700 mb-1">Attraction Name *</label>
            <input type="text" id="attraction_name" name="attraction_name" value={formData.attraction_name} onChange={handleInputChange} required className="w-full p-2 border rounded-md shadow-sm" />
          </div>
          
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

          <div>
            <label htmlFor="lat" className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input type="number" step="any" id="lat" name="lat" value={formData.lat} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm" />
          </div>
          <div>
            <label htmlFor="lng" className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input type="number" step="any" id="lng" name="lng" value={formData.lng} onChange={handleInputChange} className="w-full p-2 border rounded-md shadow-sm" />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="sacred_obj" className="block text-sm font-medium text-gray-700 mb-1">Sacred Objects</label>
            <textarea id="sacred_obj" name="sacred_obj" value={formData.sacred_obj} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md shadow-sm" />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="offering" className="block text-sm font-medium text-gray-700 mb-1">Offerings</label>
            <textarea id="offering" name="offering" value={formData.offering} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md shadow-sm" />
          </div>

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

          <div className="md:col-span-3 flex items-center justify-end space-x-4">
            <button type="button" onClick={() => router.back()} className="bg-gray-200 text-gray-800 px-6 py-3 rounded-md shadow-sm hover:bg-gray-300 font-semibold">
              Cancel
            </button>
            <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold">
              Update Attraction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

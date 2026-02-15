'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface AttractionImage {
  image_id: number;
  Image_name: string;
  attraction_id: number;
}

interface Attraction {
  attraction_id: number;
  attraction_name: string;
}

export default function EditImagePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [imageId, setImageId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    Image_name: '',
    attraction_id: '',
  });
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unlockParams = async () => {
      const { id } = await params;
      setImageId(id);
      fetchData(id);
    };
    unlockParams();
  }, [params]);

  const fetchData = async (id: string) => {
    try {
      setLoading(true);
      const [imageRes, attractionsRes] = await Promise.all([
        fetch(`/api/image/${id}`),
        fetch('/api/attraction'),
      ]);

      if (!imageRes.ok || !attractionsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const imageData = await imageRes.json();
      const attractionsData = await attractionsRes.json();

      setFormData({
        Image_name: imageData.Image_name || '',
        attraction_id: String(imageData.attraction_id || ''),
      });
      setAttractions(attractionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!imageId) return;

    if (!formData.Image_name.trim() && !selectedFile) {
      alert('Please provide an image URL or upload a file.');
      return;
    }

    if (!formData.attraction_id) {
      alert('Attraction is required.');
      return;
    }

    try {
      setUploading(true);
      let imageUrl = formData.Image_name;

      // If file is selected, upload it first
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        uploadFormData.append('attraction_id', formData.attraction_id);

        const uploadRes = await fetch('/api/image/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const uploadError = await uploadRes.json();
          throw new Error(uploadError.message || 'Failed to upload file');
        }

        const uploadData = await uploadRes.json();
        imageUrl = uploadData.image_url;
      }

      const response = await fetch(`/api/image/${imageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Image_name: imageUrl,
          attraction_id: parseInt(formData.attraction_id, 10),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update image');
      }

      alert('Image updated successfully!');
      router.push('/admin/images');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Image</h1>

      <div className="p-6 border rounded-lg shadow-lg bg-white">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="attraction_id" className="block text-sm font-medium text-gray-700 mb-1">
              Attraction *
            </label>
            <select
              id="attraction_id"
              name="attraction_id"
              value={formData.attraction_id}
              onChange={handleInputChange}
              required
              disabled={uploading}
              className="w-full p-2 border rounded-md shadow-sm"
            >
              <option value="" disabled>
                Select Attraction
              </option>
              {attractions.map((att) => (
                <option key={att.attraction_id} value={att.attraction_id}>
                  {att.attraction_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                Upload New Image
              </label>
              <input
                type="file"
                id="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="w-full p-2 border rounded-md shadow-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Max size: 5MB. Formats: JPG, PNG, GIF, etc.</p>
            </div>

            <div>
              <label htmlFor="Image_name" className="block text-sm font-medium text-gray-700 mb-1">
                Or Image URL
              </label>
              <input
                type="text"
                id="Image_name"
                name="Image_name"
                value={formData.Image_name}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
                disabled={uploading}
                className="w-full p-2 border rounded-md shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current/New Preview</label>
            <img
              src={filePreview || formData.Image_name}
              alt="Preview"
              className="max-w-full h-auto max-h-64 rounded border"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/300';
                e.currentTarget.alt = 'Image not found';
              }}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Update Image'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/images')}
              disabled={uploading}
              className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-md shadow-md hover:bg-gray-500 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Interfaces based on the database schema
interface AttractionImage {
  image_id: number;
  Image_name: string;
  attraction_id: number;
}

interface Attraction {
  attraction_id: number;
  attraction_name: string;
}

const initialFormState = {
  Image_name: '',
  attraction_id: '',
};

export default function ImageAdminPage() {
  const router = useRouter();
  const [images, setImages] = useState<AttractionImage[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [imagesRes, attractionsRes] = await Promise.all([
        fetch('/api/image'),
        fetch('/api/attraction'),
      ]);

      if (!imagesRes.ok || !attractionsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const imagesData = await imagesRes.json();
      const attractionsData = await attractionsRes.json();

      setImages(imagesData);
      setAttractions(attractionsData);

      // Set default attraction in form if available
      if (attractionsData.length > 0) {
        setFormData(prev => ({ ...prev, attraction_id: String(attractionsData[0].attraction_id) }));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    if (!formData.attraction_id) {
      alert('Attraction is required.');
      return;
    }
    
    // Check if either file or URL is provided
    if (!selectedFile && !formData.Image_name.trim()) {
      alert('Please upload a file or provide an image URL.');
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

      // Save image to database
      const response = await fetch('/api/image', {
        method: 'POST',
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
        throw new Error(errorData.message || 'Failed to add image');
      }

      setFormData(initialFormState);
      setSelectedFile(null);
      setFilePreview(null);
      fetchData(); // Refresh image list
      alert('Image added successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }
    try {
      const response = await fetch(`/api/image/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete image');
      }

      fetchData(); // Refresh the list
      alert('Image deleted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Image Management</h1>

      <div className="mb-8 p-6 border rounded-lg shadow-lg bg-white">
        <h2 className="text-xl font-semibold mb-4">Add New Image</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="attraction_id" className="block text-sm font-medium text-gray-700 mb-1">Attraction *</label>
            <select id="attraction_id" name="attraction_id" value={formData.attraction_id} onChange={handleInputChange} required className="w-full p-2 border rounded-md shadow-sm">
              <option value="" disabled>Select Attraction</option>
              {attractions.map(att => (
                <option key={att.attraction_id} value={att.attraction_id}>{att.attraction_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">Upload Image</label>
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
              <label htmlFor="Image_name" className="block text-sm font-medium text-gray-700 mb-1">Or Image URL</label>
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

          {filePreview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
              <img src={filePreview} alt="Preview" className="max-w-xs h-auto rounded border" />
            </div>
          )}

          <button 
            type="submit" 
            disabled={uploading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Add Image'}
          </button>
        </form>
      </div>

      <div className="p-4 border rounded-lg shadow-md bg-white">
        <h2 className="text-xl font-semibold mb-2">Existing Images</h2>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image) => (
              <div key={image.image_id} className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow">
                <img src={image.Image_name} alt={`Attraction ${image.attraction_id}`} className="w-full h-40 object-cover" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150'; e.currentTarget.alt = 'Image not found'; }} />
                <div className="p-2">
                  <p className="font-semibold text-sm truncate">{attractions.find(a => a.attraction_id === image.attraction_id)?.attraction_name || 'Unknown Attraction'}</p>
                  <p className="text-gray-500 text-xs">ID: {image.image_id}</p>
                  <div className="flex flex-col gap-1 mt-2">
                    <button
                      onClick={() => router.push(`/admin/images/edit/${image.image_id}`)}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-600 w-full"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(image.image_id)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-600 w-full"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

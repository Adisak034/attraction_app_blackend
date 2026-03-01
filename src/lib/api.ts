// API configuration for FastAPI backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Attractions
  ATTRACTIONS: `${API_BASE_URL}/api/attraction`,
  ATTRACTION: (id: number) => `${API_BASE_URL}/api/attraction/${id}`,

  // Users
  USERS: `${API_BASE_URL}/api/users`,
  USER: (id: number) => `${API_BASE_URL}/api/users/${id}`,

  // Images
  IMAGES: `${API_BASE_URL}/api/image`,
  IMAGE: (id: number) => `${API_BASE_URL}/api/image/${id}`,
  IMAGE_UPLOAD: `${API_BASE_URL}/api/image/upload`,

  // Ratings
  RATINGS: `${API_BASE_URL}/api/rating`,
  RATING: (id: number) => `${API_BASE_URL}/api/rating/${id}`,

  // Lookup Tables
  CATEGORIES: `${API_BASE_URL}/api/category`,
  DISTRICTS: `${API_BASE_URL}/api/district`,
  TYPES: `${API_BASE_URL}/api/type`,
  SECTS: `${API_BASE_URL}/api/sect`,
};

// Helper function for API requests
export async function apiRequest(
  url: string,
  options?: RequestInit
): Promise<any> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    // Try to parse as JSON error, otherwise use text
    let errorMessage = `API Error: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.detail || error.message || errorMessage;
    } catch (e) {
      // If response is not JSON, try to get text
      try {
        const text = await response.text();
        errorMessage = text.substring(0, 100) || errorMessage;
      } catch (e2) {
        // fallback to default error message
      }
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch (e) {
    // If JSON parsing fails, log the raw text for debugging
    const text = await response.text();
    console.error('Failed to parse JSON response:', text.substring(0, 200));
    throw new Error(`Failed to parse response from ${url}: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// GET request
export async function apiGet(url: string) {
  return apiRequest(url, { method: 'GET' });
}

// POST request
export async function apiPost(url: string, data: any) {
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// PUT request
export async function apiPut(url: string, data: any) {
  return apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// DELETE request
export async function apiDelete(url: string) {
  return apiRequest(url, { method: 'DELETE' });
}

// File upload
export async function apiUploadFile(url: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Upload Error: ${response.status}`);
  }

  return response.json();
}

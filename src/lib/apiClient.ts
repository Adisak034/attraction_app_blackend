import axios, { AxiosInstance } from 'axios';

// Create axios instance with base URL
// Support environment variable VITE_API_URL, or detect from current origin for server deployments
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.origin !== 'http://localhost:3000' && window.location.origin !== 'http://127.0.0.1:3000'
    ? window.location.origin.replace(/:\d+$/, ':8000') // Replace port with 8000 for production
    : 'http://localhost:8000');

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMsg = `HTTP ${error.response?.status || 'Error'}`;
    
    if (error.response?.data) {
      errorMsg = error.response.data.detail || error.response.data.message || errorMsg;
    }
    
    throw new Error(errorMsg);
  }
);

// Resolve image URLs against the API base URL
export function resolveImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;
  
  // If already a full URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If relative path, resolve against current origin but with port 8000
  if (imageUrl.startsWith('/')) {
    // Get the host (IP or domain) from current location
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${host}:8000${imageUrl}`;
  }
  
  return imageUrl;
}

export function apiGet(endpoint: string) {
  return axiosInstance.get(endpoint).then((res) => res.data);
}

export function apiPost(endpoint: string, data: any) {
  return axiosInstance.post(endpoint, data).then((res) => res.data);
}

export function apiPut(endpoint: string, data: any) {
  return axiosInstance.put(endpoint, data).then((res) => res.data);
}

export function apiDelete(endpoint: string) {
  return axiosInstance.delete(endpoint).then((res) => res.data);
}

export async function apiUploadFile(
  endpoint: string,
  file: File,
  fields?: Record<string, string>
) {
  const formData = new FormData();
  formData.append('file', file);
  if (fields) {
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  try {
    const response = await axiosInstance.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    let errorMsg = 'Upload failed';
    if (error instanceof Error) {
      errorMsg = error.message;
    }
    throw new Error(errorMsg);
  }
}

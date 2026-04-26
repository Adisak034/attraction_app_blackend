import axios, { AxiosInstance } from 'axios';

// Create axios instance with base URL
const API_BASE_URL = 'http://localhost:8000';
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

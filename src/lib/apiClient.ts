// =============================================================================
// apiClient.ts
// =============================================================================
// HTTP Client ส่วนกลางของแอปพลิเคชัน ใช้ axios เป็นพื้นฐาน
// ทุก component ที่ต้องการเรียก API จะต้องใช้ผ่านไฟล์นี้
//
// ความสามารถหลัก:
//   - กำหนด base URL จาก VITE_API_URL (.env) โดยอัตโนมัติ
//   - Response interceptor แปลง error จาก server เป็นข้อความที่อ่านได้
//   - resolveImageUrl() - แปลง relative path รูปภาพเป็น absolute URL
//   - apiGet(), apiPost(), apiPut(), apiDelete() - HTTP Methods พร้อม generic support
//   - apiUploadFile() - POST multipart/form-data สำหรับอัปโหลดไฟล์
// =============================================================================

import axios, { AxiosInstance } from 'axios';

// =============================================================================
// Base Configuration
// =============================================================================

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// =============================================================================
// Image URL Helper
// =============================================================================

/**
 * แปลง URL รูปภาพ relative ให้เป็น absolute URL โดยใช้พอร์ตของ backend API_BASE_URL
 */
export function resolveImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  if (imageUrl.startsWith('/')) {
    return `${API_BASE_URL}${imageUrl}`;
  }

  return `${API_BASE_URL}/${imageUrl}`;
}

// =============================================================================
// Core HTTP Methods
// =============================================================================

/**
 * HTTP GET - ดึงข้อมูลจาก API
 */
export async function apiGet<T = any>(endpoint: string): Promise<T> {
  const res = await axiosInstance.get<T>(endpoint);
  return res.data;
}

/**
 * HTTP POST - ส่งข้อมูลใหม่ไปยัง API
 */
export async function apiPost<T = any>(endpoint: string, data: unknown): Promise<T> {
  const res = await axiosInstance.post<T>(endpoint, data);
  return res.data;
}

/**
 * HTTP PUT - อัปเดตข้อมูลที่มีอยู่
 */
export async function apiPut<T = any>(endpoint: string, data: unknown): Promise<T> {
  const res = await axiosInstance.put<T>(endpoint, data);
  return res.data;
}

/**
 * HTTP DELETE - ลบข้อมูล
 */
export async function apiDelete<T = any>(endpoint: string): Promise<T> {
  const res = await axiosInstance.delete<T>(endpoint);
  return res.data;
}

// =============================================================================
// File Upload Method
// =============================================================================

/**
 * อัปโหลดไฟล์ผ่าน multipart/form-data พร้อมแนบ fields เพิ่มเติม
 */
export async function apiUploadFile<T = any>(
  endpoint: string,
  file: File,
  fields?: Record<string, string>
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  if (fields) {
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  try {
    const response = await axiosInstance.post<T>(endpoint, formData, {
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

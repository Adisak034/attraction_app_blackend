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
//   - apiGet()    - HTTP GET
//   - apiPost()   - HTTP POST (JSON)
//   - apiPut()    - HTTP PUT (JSON)
//   - apiDelete() - HTTP DELETE
//   - apiUploadFile() - POST multipart/form-data (อัปโหลดไฟล์)
//
// Environment Variables ที่ต้องการ:
//   VITE_API_URL  - URL ของ backend เช่น http://localhost:8000
// =============================================================================

import axios, { AxiosInstance } from 'axios';

// กำหนด URL ฐานสำหรับเรียก API — ตั้งค่าใน VITE_API_URL ของไฟล์ .env
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');


// สร้าง axios instance พร้อมค่าตั้งต้น
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// เพิ่ม interceptor สำหรับจัดการ error จาก response
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // ดึงข้อความ error จาก response ของ server
    let errorMsg = `HTTP ${error.response?.status || 'Error'}`;

    if (error.response?.data) {
      errorMsg = error.response.data.detail || error.response.data.message || errorMsg;
    }

    throw new Error(errorMsg);
  }
);

// แปลง URL รูปภาพ relative ให้เป็น absolute URL โดยใช้ port 8000
export function resolveImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;

  // ถ้าเป็น URL เต็มอยู่แล้ว คืนค่าเดิม
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // ถ้าเป็น relative path (ขึ้นต้นด้วย /) ให้ต่อกับ API_BASE_URL ที่ตั้งค่าไว้ใน VITE_API_URL
  if (imageUrl.startsWith('/')) {
    return `${API_BASE_URL}${imageUrl}`;
  }

  return `${API_BASE_URL}/${imageUrl}`;

}

// ฟังก์ชัน HTTP GET - ดึงข้อมูลจาก API
export function apiGet(endpoint: string) {
  return axiosInstance.get(endpoint).then((res) => res.data);
}

// ฟังก์ชัน HTTP POST - ส่งข้อมูลใหม่ไปยัง API
export function apiPost(endpoint: string, data: any) {
  return axiosInstance.post(endpoint, data).then((res) => res.data);
}

// ฟังก์ชัน HTTP PUT - อัปเดตข้อมูลที่มีอยู่
export function apiPut(endpoint: string, data: any) {
  return axiosInstance.put(endpoint, data).then((res) => res.data);
}

// ฟังก์ชัน HTTP DELETE - ลบข้อมูล
export function apiDelete(endpoint: string) {
  return axiosInstance.delete(endpoint).then((res) => res.data);
}

// ฟังก์ชันอัปโหลดไฟล์ผ่าน multipart/form-data
export async function apiUploadFile(
  endpoint: string,
  file: File,
  fields?: Record<string, string>  // field เพิ่มเติมที่ต้องการส่งพร้อมกับไฟล์
) {
  const formData = new FormData();
  formData.append('file', file);

  // เพิ่ม field อื่นๆ ลงใน FormData (เช่น attraction_id)
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

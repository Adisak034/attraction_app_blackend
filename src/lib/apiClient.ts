import axios, { AxiosInstance } from 'axios';

// กำหนด URL ฐานสำหรับเรียก API
// ถ้า VITE_API_URL ถูกตั้งไว้ (ไม่ว่าง) ให้ใช้ค่านั้น
// ถ้าไม่มี ให้ detect จาก hostname ปัจจุบัน + port 8000 (รองรับทั้ง dev และ server)
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    // ใช้ hostname (ไม่มี port) แล้วต่อ :8000 เสมอ
    return `${protocol}//${hostname}:8000`;
  }
  return 'http://localhost:8000';
}

export const API_BASE_URL = getApiBaseUrl();

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

  // ถ้าเป็น relative path (ขึ้นต้นด้วย /) ให้ต่อกับ host ปัจจุบันที่ port 8000
  if (imageUrl.startsWith('/')) {
    // ดึง hostname จาก URL ปัจจุบัน (ใช้ IP หรือ domain ได้)
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${host}:8000${imageUrl}`;
  }

  return imageUrl;
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

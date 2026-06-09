import { useAlert } from '@/components/AlertDialog';

// เก็บ reference ของ showAlert function เพื่อใช้งานนอก React component
// จำเป็นเพราะ hook (useAlert) ไม่สามารถเรียกใช้นอก component ได้โดยตรง
let alertFunction: ReturnType<typeof useAlert>['showAlert'] | null = null;

// ตั้งค่า alert function จาก AppInitializer ใน main.tsx
export const setAlertFunction = (fn: ReturnType<typeof useAlert>['showAlert']) => {
  alertFunction = fn;
};

// แสดง dialog ยืนยันการดำเนินการ (มีปุ่ม ยืนยัน / ยกเลิก)
// คืน true ถ้าผู้ใช้กด ยืนยัน, false ถ้ากด ยกเลิก
export async function confirmAction(title: string, text?: string) {
  if (!alertFunction) {
    console.warn('Alert function not initialized');
    return false;
  }

  return await alertFunction({
    type: 'warning',
    title,
    text,
    confirmText: 'ยืนยัน',
    cancelText: 'ยกเลิก',
  });
}

// แสดง dialog แจ้งความสำเร็จ (ปิดอัตโนมัติหลัง 3 วินาที)
export function showSuccess(title: string, text?: string) {
  if (!alertFunction) {
    console.warn('Alert function not initialized');
    return Promise.resolve();
  }

  return alertFunction({
    type: 'success',
    title,
    text,
    confirmText: 'ตกลง',
  });
}

// แสดง dialog แจ้ง error (ปิดอัตโนมัติหลัง 3 วินาที)
export function showError(title: string, text?: string) {
  if (!alertFunction) {
    console.warn('Alert function not initialized');
    return Promise.resolve();
  }

  return alertFunction({
    type: 'error',
    title,
    text,
    confirmText: 'ตกลง',
  });
}

// แสดง dialog แจ้งข้อมูลทั่วไป (ปิดอัตโนมัติหลัง 3 วินาที)
export function showInfo(title: string, text?: string) {
  if (!alertFunction) {
    console.warn('Alert function not initialized');
    return Promise.resolve();
  }

  return alertFunction({
    type: 'info',
    title,
    text,
    confirmText: 'ตกลง',
  });
}

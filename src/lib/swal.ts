// =============================================================================
// swal.ts
// =============================================================================
// Utility สำหรับแสดง Alert/Dialog จากภายนอก React Component
// เชื่อมต่อกับ AlertProvider ใน AlertDialog.tsx ผ่าน setAlertFunction()
//
// ปัญหาที่แก้: React Hook (useAlert) ไม่สามารถเรียกใช้นอก component ได้
// วิธีแก้: เก็บ reference ของ showAlert ไว้ใน module-level variable
//
// ฟังก์ชันที่ใช้ได้:
//   confirmAction(title, text) - dialog ยืนยัน (ปุ่ม ยืนยัน / ยกเลิก) → คืน boolean
//   showSuccess(title, text)   - dialog สำเร็จ (ปิดอัตโนมัติ 3 วินาที)
//   showError(title, text)     - dialog error (ปิดอัตโนมัติ 3 วินาที)
//   showInfo(title, text)      - dialog ข้อมูลทั่วไป (ปิดอัตโนมัติ 3 วินาที)
// =============================================================================

import { useAlert, AlertConfig } from '@/components/AlertDialog';

type ShowAlertFn = ReturnType<typeof useAlert>['showAlert'];

let alertFunction: ShowAlertFn | null = null;

/**
 * ตั้งค่า alert function จาก AppInitializer ใน main.tsx
 */
export const setAlertFunction = (fn: ShowAlertFn): void => {
  alertFunction = fn;
};

// =============================================================================
// Internal Helper (DRY Execution)
// =============================================================================

function executeAlert(config: AlertConfig, fallbackResult = true): Promise<boolean> {
  if (!alertFunction) {
    console.warn('[swal] Alert function not initialized. Did you wrap your app in <AlertProvider>?');
    return Promise.resolve(fallbackResult);
  }
  return alertFunction(config);
}

// =============================================================================
// Public Dialog Utilities
// =============================================================================

/**
 * แสดง dialog ยืนยันการดำเนินการ (มีปุ่ม ยืนยัน / ยกเลิก)
 * คืนค่า true ถ้าผู้ใช้กด ยืนยัน, false ถ้ากด ยกเลิก
 */
export function confirmAction(title: string, text?: string): Promise<boolean> {
  return executeAlert(
    {
      type: 'warning',
      title,
      text,
      confirmText: 'ยืนยัน',
      cancelText: 'ยกเลิก',
    },
    false
  );
}

/**
 * แสดง dialog แจ้งความสำเร็จ (ปิดอัตโนมัติหลัง 3 วินาที)
 */
export function showSuccess(title: string, text?: string): Promise<boolean> {
  return executeAlert({
    type: 'success',
    title,
    text,
    confirmText: 'ตกลง',
  });
}

/**
 * แสดง dialog แจ้งข้อผิดพลาด (ปิดอัตโนมัติหลัง 3 วินาที)
 */
export function showError(title: string, text?: string): Promise<boolean> {
  return executeAlert({
    type: 'error',
    title,
    text,
    confirmText: 'ตกลง',
  });
}

/**
 * แสดง dialog แจ้งข้อมูลทั่วไป (ปิดอัตโนมัติหลัง 3 วินาที)
 */
export function showInfo(title: string, text?: string): Promise<boolean> {
  return executeAlert({
    type: 'info',
    title,
    text,
    confirmText: 'ตกลง',
  });
}

import { useAlert } from '@/components/AlertDialog';

// Store alert function reference for use in non-React contexts
let alertFunction: ReturnType<typeof useAlert>['showAlert'] | null = null;

export const setAlertFunction = (fn: ReturnType<typeof useAlert>['showAlert']) => {
  alertFunction = fn;
};

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

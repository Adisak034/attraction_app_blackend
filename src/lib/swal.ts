import Swal from 'sweetalert2';

const baseOptions = {
  confirmButtonColor: '#2563eb',
  cancelButtonColor: '#6b7280',
};

export async function confirmAction(title: string, text?: string) {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    ...baseOptions,
  });

  return result.isConfirmed;
}

export function showSuccess(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: 'ตกลง',
    ...baseOptions,
  });
}

export function showError(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'ตกลง',
    ...baseOptions,
  });
}

export function showInfo(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: 'info',
    confirmButtonText: 'ตกลง',
    ...baseOptions,
  });
}

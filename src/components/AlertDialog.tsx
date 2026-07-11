// =============================================================================
// AlertDialog.tsx
// =============================================================================
// ระบบ Alert Dialog ส่วนกลางของแอป ใช้ Framer Motion สำหรับ animation
// ออกแบบมาให้ใช้แทน native browser alert/confirm
//
// ประกอบด้วย:
//   - AlertDialog      : modal component แสดง icon, ชื่อ, ข้อความ, ปุ่มกระทำ
//   - AlertProvider    : Context Provider ครอบ component tree ทั้งหมด
//   - useAlert()       : Hook สำหรับเรียก showAlert จากภายใน component
//   - Sub-components   : AlertIconBadge, AlertActionButtons (เพื่อความกระชับ อ่านง่าย)
//
// ประเภท Alert (AlertType):
//   success  - สีเขียว (✓)  ปิดอัตโนมัติ 3 วินาที
//   error    - สีแดง  (✕)  ปิดอัตโนมัติ 3 วินาที
//   info     - สีน้ำเงิน (ⓘ)  ปิดอัตโนมัติ 3 วินาที
//   warning  - สีส้ม   (!) มีปุ่ม ยืนยัน + ยกเลิก (confirm dialog)
//   confirm  - สีส้ม   (!) มีปุ่ม ยืนยัน + ยกเลิก (confirm dialog)
//
// วิธีใช้:
//   const { showAlert } = useAlert();
//   const confirmed = await showAlert({ type: 'warning', title: '...', text: '...' });
// =============================================================================

import React, { createContext, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// =============================================================================
// Types & Context
// =============================================================================

export type AlertType = 'success' | 'error' | 'info' | 'warning' | 'confirm';

export interface AlertConfig {
  type: AlertType;
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertContextType {
  showAlert: (config: AlertConfig) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

// =============================================================================
// Helper: Style & Icon Mapping
// =============================================================================

interface AlertStyle {
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconBgColor: string;
  confirmButtonColor: string;
}

function getAlertStyle(type: AlertType): AlertStyle {
  switch (type) {
    case 'success':
      return {
        icon: '✓',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-700',
        iconBgColor: 'bg-green-100',
        confirmButtonColor: 'bg-green-600 hover:bg-green-700',
      };
    case 'error':
      return {
        icon: '✕',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-700',
        iconBgColor: 'bg-red-100',
        confirmButtonColor: 'bg-red-600 hover:bg-red-700',
      };
    case 'info':
      return {
        icon: 'ⓘ',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700',
        iconBgColor: 'bg-blue-100',
        confirmButtonColor: 'bg-blue-600 hover:bg-blue-700',
      };
    case 'warning':
    case 'confirm':
      return {
        icon: '!',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-700',
        iconBgColor: 'bg-amber-100',
        confirmButtonColor: 'bg-blue-600 hover:bg-blue-700',
      };
  }
}

// =============================================================================
// Sub-Component: AlertIconBadge
// =============================================================================

interface AlertIconBadgeProps {
  icon: string;
  iconBgColor: string;
  textColor: string;
}

function AlertIconBadge({ icon, iconBgColor, textColor }: AlertIconBadgeProps) {
  return (
    <div className="flex justify-center pt-6">
      <div className={`${iconBgColor} rounded-full w-16 h-16 flex items-center justify-center text-3xl font-bold ${textColor}`}>
        {icon}
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Component: AlertActionButtons
// =============================================================================

interface AlertActionButtonsProps {
  isConfirmDialog: boolean;
  confirmButtonColor: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function AlertActionButtons({
  isConfirmDialog,
  confirmButtonColor,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: AlertActionButtonsProps) {
  return (
    <div className={`flex gap-3 px-6 pb-6 ${isConfirmDialog ? 'justify-end' : 'justify-center'}`}>
      {isConfirmDialog && (
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
        >
          {cancelText}
        </button>
      )}
      <button
        type="button"
        onClick={onConfirm}
        className={`px-6 py-2 text-white rounded-lg font-medium transition-colors ${confirmButtonColor}`}
      >
        {confirmText}
      </button>
    </div>
  );
}

// =============================================================================
// Main Component: AlertDialog
// =============================================================================

interface AlertDialogProps extends AlertConfig {
  isOpen: boolean;
  onClose: () => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  type,
  title,
  text,
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก',
  onConfirm,
  onCancel,
}) => {
  const { icon, bgColor, borderColor, textColor, iconBgColor, confirmButtonColor } = getAlertStyle(type);
  const isConfirmDialog = type === 'confirm' || type === 'warning';

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          />

          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className={`${bgColor} border ${borderColor} rounded-lg shadow-xl max-w-sm w-full overflow-hidden`}>
              <AlertIconBadge icon={icon} iconBgColor={iconBgColor} textColor={textColor} />

              <div className="text-center px-6 py-4">
                <h2 className={`text-xl font-bold ${textColor} mb-2`}>{title}</h2>
                {text && <p className="text-gray-600 text-sm">{text}</p>}
              </div>

              <AlertActionButtons
                isConfirmDialog={isConfirmDialog}
                confirmButtonColor={confirmButtonColor}
                confirmText={confirmText}
                cancelText={cancelText}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// =============================================================================
// AlertProvider
// =============================================================================

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<(AlertConfig & { id: string; isOpen: boolean })[]>([]);

  const showAlert = (config: AlertConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substr(2, 9);
      const alertConfig = {
        ...config,
        id,
        isOpen: true,
        onConfirm: () => {
          config.onConfirm?.();
          resolve(true);
          setAlerts((prev) => prev.filter((a) => a.id !== id));
        },
        onCancel: () => {
          config.onCancel?.();
          resolve(false);
          setAlerts((prev) => prev.filter((a) => a.id !== id));
        },
      };

      setAlerts((prev) => [...prev, alertConfig]);

      if (config.type !== 'confirm' && config.type !== 'warning') {
        setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.id !== id));
          resolve(true);
        }, 3000);
      }
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alerts.map((alert) => (
        <AlertDialog
          key={alert.id}
          {...alert}
          isOpen={alert.isOpen}
          onClose={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
        />
      ))}
    </AlertContext.Provider>
  );
};

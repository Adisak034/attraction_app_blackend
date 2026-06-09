import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ประเภทของ alert dialog
export type AlertType = 'success' | 'error' | 'info' | 'warning' | 'confirm';

// ค่า configuration ของ alert dialog
export interface AlertConfig {
  type: AlertType;
  title: string;
  text?: string;          // ข้อความรายละเอียด (optional)
  confirmText?: string;   // ข้อความปุ่ม confirm
  cancelText?: string;    // ข้อความปุ่ม cancel
  onConfirm?: () => void; // callback เมื่อกด confirm
  onCancel?: () => void;  // callback เมื่อกด cancel
}

// ประเภทของ context สำหรับ alert
interface AlertContextType {
  showAlert: (config: AlertConfig) => Promise<boolean>;
}

// สร้าง Context สำหรับ alert system
const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Hook สำหรับเรียกใช้ alert - ต้องใช้ภายใน AlertProvider เท่านั้น
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

// ฟังก์ชันคืนค่า icon และสีตามประเภทของ alert
const getIconAndColor = (type: AlertType) => {
  switch (type) {
    case 'success':
      return { icon: '✓', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700', iconBgColor: 'bg-green-100' };
    case 'error':
      return { icon: '✕', bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-700', iconBgColor: 'bg-red-100' };
    case 'info':
      return { icon: 'ⓘ', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700', iconBgColor: 'bg-blue-100' };
    case 'warning':
    case 'confirm':
      return { icon: '!', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-700', iconBgColor: 'bg-amber-100' };
  }
};

// Component หลักของ Alert Dialog (modal overlay)
const AlertDialog: React.FC<AlertConfig & { isOpen: boolean; onClose: () => void }> = ({
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
  const { icon, bgColor, borderColor, textColor, iconBgColor } = getIconAndColor(type);
  // warning และ confirm จะแสดงปุ่ม cancel ด้วย
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
          {/* พื้นหลังมืด (backdrop) - กดเพื่อปิด dialog */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          />

          {/* ตัว Dialog - อยู่กลางหน้าจอ */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className={`${bgColor} border ${borderColor} rounded-lg shadow-xl max-w-sm w-full`}>
              {/* ไอคอนแสดงประเภท alert */}
              <div className="flex justify-center pt-6">
                <div className={`${iconBgColor} rounded-full w-16 h-16 flex items-center justify-center text-3xl font-bold ${textColor}`}>
                  {icon}
                </div>
              </div>

              {/* เนื้อหา: ชื่อเรื่องและรายละเอียด */}
              <div className="text-center px-6 py-4">
                <h2 className={`text-xl font-bold ${textColor} mb-2`}>{title}</h2>
                {text && <p className="text-gray-600 text-sm">{text}</p>}
              </div>

              {/* ปุ่มกระทำ: confirm และ cancel */}
              <div className={`flex gap-3 px-6 pb-6 ${isConfirmDialog ? 'justify-end' : 'justify-center'}`}>
                {/* ปุ่ม cancel แสดงเฉพาะ confirm/warning dialog */}
                {isConfirmDialog && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                  >
                    {cancelText}
                  </button>
                )}
                {/* ปุ่ม confirm - สีเปลี่ยนตามประเภท alert */}
                <button
                  onClick={handleConfirm}
                  className={`px-6 py-2 text-white rounded-lg font-medium transition-colors ${
                    type === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : type === 'success'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Provider สำหรับ alert system - ครอบ component tree เพื่อให้ทุก component ใช้ showAlert ได้
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // เก็บรายการ alert ที่กำลังแสดงอยู่ (รองรับหลาย alert พร้อมกัน)
  const [alerts, setAlerts] = useState<(AlertConfig & { id: string; isOpen: boolean })[]>([]);

  // ฟังก์ชันแสดง alert และคืน Promise ที่ resolve เมื่อผู้ใช้กด confirm/cancel
  const showAlert = (config: AlertConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      // สร้าง ID เฉพาะสำหรับ alert นี้
      const id = Math.random().toString(36).substr(2, 9);
      const alertConfig = {
        ...config,
        id,
        isOpen: true,
        onConfirm: () => {
          config.onConfirm?.();
          resolve(true); // ผู้ใช้กด confirm
          setAlerts((prev) => prev.filter((a) => a.id !== id)); // ลบออกจากรายการ
        },
        onCancel: () => {
          config.onCancel?.();
          resolve(false); // ผู้ใช้กด cancel
          setAlerts((prev) => prev.filter((a) => a.id !== id)); // ลบออกจากรายการ
        },
      };

      setAlerts((prev) => [...prev, alertConfig]);

      // ปิดอัตโนมัติหลัง 3 วินาที สำหรับ alert ที่ไม่ใช่ confirm dialog
      if (config.type !== 'confirm') {
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
      {/* แสดง alert ทุกตัวที่อยู่ในรายการ */}
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

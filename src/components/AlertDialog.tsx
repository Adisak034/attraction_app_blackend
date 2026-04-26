import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className={`${bgColor} border ${borderColor} rounded-lg shadow-xl max-w-sm w-full`}>
              {/* Icon */}
              <div className="flex justify-center pt-6">
                <div className={`${iconBgColor} rounded-full w-16 h-16 flex items-center justify-center text-3xl font-bold ${textColor}`}>
                  {icon}
                </div>
              </div>

              {/* Content */}
              <div className="text-center px-6 py-4">
                <h2 className={`text-xl font-bold ${textColor} mb-2`}>{title}</h2>
                {text && <p className="text-gray-600 text-sm">{text}</p>}
              </div>

              {/* Buttons */}
              <div className={`flex gap-3 px-6 pb-6 ${isConfirmDialog ? 'justify-end' : 'justify-center'}`}>
                {isConfirmDialog && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                  >
                    {cancelText}
                  </button>
                )}
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

      // Auto-close non-confirm alerts after 3 seconds
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

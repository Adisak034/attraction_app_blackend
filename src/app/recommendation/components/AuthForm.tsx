// =============================================================================
// components/AuthForm.tsx
// =============================================================================
// ฟอร์มหน้าต่างสำหรับ "เข้าสู่ระบบ (Login)" และ "ลงทะเบียน (Register)"
//
// ความสามารถหลัก:
//   - สลับโหมดการทำงานได้ระหว่าง เข้าสู่ระบบ / ลงทะเบียน
//   - รับข้อมูล ชื่อผู้ใช้ (Username) และ รหัสผ่าน (Password) พร้อม Type ที่ปลอดภัย
//   - ฟังก์ชัน Toggle ซ่อน/แสดง รหัสผ่าน
//   - ฟังก์ชัน Remember Me (จดจำบัญชีในอุปกรณ์นี้)
//   - แสดงผล Error เมื่อล็อกอินหรือสมัครไม่สำเร็จ
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface AuthFormData {
  name: string;
  password: string;
  confirmPassword?: string;
  [key: string]: string | undefined;
}

interface AuthFormProps {
  step: 'login' | 'register';
  setStep: (step: 'login' | 'register' | 'selection') => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>> | ((data: any) => void);
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  error: string;
  loading: boolean;
  handleRegister: (e: React.FormEvent) => void;
  handleLogin: (e: React.FormEvent) => void;
}

// =============================================================================
// Sub-Components (UI Modularization)
// =============================================================================

interface AuthFormHeaderProps {
  isRegister: boolean;
}

function AuthFormHeader({ isRegister }: AuthFormHeaderProps) {
  return (
    <div className="text-center pt-2 sm:pt-10 mb-6 sm:mb-7">
      <h2 className="text-2xl font-black mb-2 gold-gradient-text uppercase tracking-tight">
        {isRegister ? 'ลงทะเบียน' : 'ยินดีต้อนรับกลับมา'}
      </h2>
      <p className="text-gray-400 text-xs font-medium">ร่วมเดินทางสู่เส้นทางแห่งศรัทธา</p>
    </div>
  );
}

interface AuthInputFieldProps {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  rightAction?: React.ReactNode;
  required?: boolean;
}

function AuthInputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
  rightAction,
  required = true,
}: AuthInputFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs sm:text-sm font-semibold text-faith-gold/80 pl-1">{label}</label>
      <div className="relative">
        <div className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-500 z-10 pointer-events-none">
          {icon}
        </div>
        <input
          type={type}
          required={required}
          placeholder={placeholder}
          className={`w-full text-xs sm:text-sm bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-12 sm:pl-14 focus:border-faith-gold transition-all outline-none backdrop-blur-xl ${rightAction ? 'pr-20 sm:pr-24' : 'pr-4 sm:pr-6'
            }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {rightAction && <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">{rightAction}</div>}
      </div>
    </div>
  );
}

interface AuthFormFooterProps {
  isRegister: boolean;
  onSwitchMode: () => void;
  onBackToHome: () => void;
}

function AuthFormFooter({ isRegister, onSwitchMode, onBackToHome }: AuthFormFooterProps) {
  return (
    <>
      <p className="mt-6 text-center text-xs sm:text-sm text-gray-400">
        {isRegister ? 'มีบัญชีอยู่แล้ว?' : 'เพิ่งเคยมาที่นี่ครั้งแรก?'}{' '}
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-faith-gold hover:underline underline-offset-4 ml-1 font-semibold"
        >
          {isRegister ? 'เข้าสู่ระบบ' : 'ลงทะเบียน'}
        </button>
      </p>

      <button
        onClick={onBackToHome}
        className="mt-4 sm:mt-5 text-gray-400 hover:text-faith-gold text-xs sm:text-sm w-full transition-all font-semibold"
      >
        ← กลับหน้าหลัก
      </button>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AuthForm({
  step,
  setStep,
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  error,
  loading,
  handleRegister,
  handleLogin,
}: AuthFormProps) {
  const isRegister = step === 'register';

  const updateField = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const passwordToggleBtn = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="text-faith-gold hover:text-amber-300 transition-colors p-1"
      aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
    >
      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <motion.div
      key="auth"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="w-full h-full px-4 relative z-10 min-h-screen flex flex-col justify-center items-center py-6 sm:py-10 my-auto"
    >
      <div className="glass-card rounded-2xl sm:rounded-[3rem] p-6 sm:px-10 sm:py-7 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-lg sm:max-w-xl">
        {/* Header Section */}
        <AuthFormHeader isRegister={isRegister} />

        {/* Input Form Section */}
        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
          <AuthInputField
            label="ชื่อผู้ใช้"
            icon={<User size={16} />}
            placeholder="กรอกชื่อผู้ใช้"
            value={formData.name}
            onChange={(val) => updateField('name', val)}
          />

          <AuthInputField
            label="รหัสผ่าน"
            type={showPassword ? 'text' : 'password'}
            icon={<Lock size={16} />}
            placeholder="รหัสผ่านของคุณ"
            value={formData.password}
            onChange={(val) => updateField('password', val)}
            rightAction={passwordToggleBtn}
          />

          {isRegister && (
            <AuthInputField
              label="ยืนยันรหัสผ่าน"
              type={showPassword ? 'text' : 'password'}
              icon={<Lock size={16} />}
              placeholder="ยืนยันรหัสผ่าน"
              value={formData.confirmPassword || ''}
              onChange={(val) => updateField('confirmPassword', val)}
              rightAction={passwordToggleBtn}
            />
          )}

          {/* Remember Me Checkbox */}
          <div
            className="flex items-center gap-2 sm:gap-3 px-1 cursor-pointer group pt-1"
            onClick={() => setRememberMe(!rememberMe)}
          >
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-faith-gold border-faith-gold' : 'border-white/20'
                }`}
            >
              {rememberMe && <CheckCircle2 size={14} className="sm:size-4 text-black" />}
            </div>
            <span className="text-xs sm:text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
              จดจำบัญชีในอุปกรณ์นี้
            </span>
          </div>

          {/* Error Message Display */}
          {error && (
            <p className="text-red-400 text-xs text-center font-bold bg-red-950/40 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-red-900/50">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-faith-gold hover:bg-amber-400 text-[#1A0404] py-3 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-base transition-all shadow-2xl shadow-amber-600/30 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isRegister ? 'ลงทะเบียน' : 'เข้าสู่ระบบ'} <ArrowRight size={18} className="sm:size-5" />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer Section */}
        <AuthFormFooter
          isRegister={isRegister}
          onSwitchMode={() => {
            setShowPassword(false);
            setStep(isRegister ? 'login' : 'register');
          }}
          onBackToHome={() => setStep('selection')}
        />
      </div>
    </motion.div>
  );
}

// =============================================================================
// components/AuthForm.tsx
// =============================================================================
// ฟอร์มหน้าต่างสำหรับ "เข้าสู่ระบบ (Login)" และ "ลงทะเบียน (Register)"
// 
// ความสามารถหลัก:
// - สลับโหมดการทำงานได้ระหว่าง เข้าสู่ระบบ / ลงทะเบียน
// - รับข้อมูล ชื่อผู้ใช้ (Username) และ รหัสผ่าน (Password)
// - ฟังก์ชัน Toggle ซ่อน/แสดง รหัสผ่าน
// - ฟังก์ชัน Remember Me (จดจำบัญชีในอุปกรณ์นี้)
// - แสดงผล Error เมื่อล็อกอินหรือสมัครไม่สำเร็จ
// =============================================================================

import { motion } from 'framer-motion';
import { User, LogIn, Lock, Eye, EyeOff, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface AuthFormProps {
  step: 'login' | 'register';
  setStep: (step: 'login' | 'register' | 'selection') => void;
  formData: any;
  setFormData: (data: any) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  error: string;
  loading: boolean;
  handleRegister: (e: React.FormEvent) => void;
  handleLogin: (e: React.FormEvent) => void;
}

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
  handleLogin
}: AuthFormProps) {
  return (
    <motion.div
      key="auth"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="w-full h-full px-4 sm:px-4 relative z-10 min-h-screen flex flex-col justify-center items-center"
    >
      <div className="glass-card rounded-2xl sm:rounded-[3rem] p-6 sm:px-10 sm:py-7 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-lg sm:max-w-xl">
        <div className="text-center mb-8 sm:mb-7">
          <motion.div
            initial={{ rotateY: 0 }} animate={{ rotateY: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 sm:w-14 sm:h-14 bg-faith-gold rounded-2xl sm:rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-5 shadow-2xl shadow-amber-500/30 text-[#1A0404]"
          >
            {step === 'register' ? <User size={32} className="sm:hidden" /> : <LogIn size={32} className="sm:hidden" />}
            {step === 'register' ? <User size={26} className="hidden sm:block" /> : <LogIn size={26} className="hidden sm:block" />}
          </motion.div>
          <h2 className="text-2xl sm:text-2xl font-black mb-2 sm:mb-2 gold-gradient-text uppercase tracking-tight">{step === 'register' ? 'ลงทะเบียน' : 'ยินดีต้อนรับกลับมา'}</h2>
          <p className="text-gray-400 text-xs sm:text-xs font-medium">ร่วมเดินทางสู่เส้นทางแห่งศรัทธา</p>
        </div>

        {/* ฟอร์มกรอกข้อมูล */}
        <form onSubmit={step === 'register' ? handleRegister : handleLogin} className="space-y-4 sm:space-y-4">
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-faith-gold/80 pl-1">ชื่อผู้ใช้</label>
            <div className="relative">
              <User className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-500 z-10 pointer-events-none" size={16} />
              <input
                type="text" required placeholder="กรอกชื่อผู้ใช้"
                className="w-full text-xs sm:text-sm bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-12 sm:pl-14 pr-4 sm:pr-6 focus:border-faith-gold transition-all outline-none backdrop-blur-xl"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-faith-gold/80 pl-1">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-500 z-10 pointer-events-none" size={16} />
              <input
                type={showPassword ? "text" : "password"} required placeholder="รหัสผ่านของคุณ"
                className="w-full text-xs sm:text-sm bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-12 sm:pl-14 pr-20 sm:pr-24 focus:border-faith-gold transition-all outline-none backdrop-blur-xl"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-faith-gold hover:text-amber-300 transition-colors"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {step === 'register' && (
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-faith-gold/80 pl-1">ยืนยันรหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-500 z-10 pointer-events-none" size={16} />
                <input
                  type={showPassword ? "text" : "password"} required placeholder="ยืนยันรหัสผ่าน"
                  className="w-full text-xs sm:text-sm bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-12 sm:pl-14 pr-20 sm:pr-24 focus:border-faith-gold transition-all outline-none backdrop-blur-xl"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-faith-gold hover:text-amber-300 transition-colors"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* จดจำบัญชี (Remember Me) */}
          <div className="flex items-center gap-2 sm:gap-3 px-1 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-faith-gold border-faith-gold' : 'border-white/20'}`}>
              {rememberMe && <CheckCircle2 size={14} className="sm:size-4 text-black" />}
            </div>
            <span className="text-xs sm:text-sm text-gray-300 font-medium group-hover:text-white transition-colors">จดจำบัญชีในอุปกรณ์นี้</span>
          </div>

          {/* แสดงข้อความ Error กรณีเกิดข้อผิดพลาด */}
          {error && <p className="text-red-400 text-xs text-center font-bold bg-red-950/40 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-red-900/50">{error}</p>}

          {/* ปุ่ม Submit ฟอร์ม */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit" disabled={loading}
            className="w-full bg-faith-gold hover:bg-amber-400 text-[#1A0404] py-3 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-base sm:text-base transition-all shadow-2xl shadow-amber-600/30 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>{step === 'register' ? 'ลงทะเบียน' : 'เข้าสู่ระบบ'} <ArrowRight size={18} className="sm:size-5" /></>
            )}
          </motion.button>
        </form>

        <p className="mt-6 sm:mt-6 text-center text-xs sm:text-sm text-gray-400">
          {step === 'register' ? 'มีบัญชีอยู่แล้ว?' : 'เพิ่งเคยมาที่นี่ครั้งแรก?'} <button type="button" onClick={() => { setShowPassword(false); setStep(step === 'register' ? 'login' : 'register'); }} className="text-faith-gold hover:underline underline-offset-4 ml-1 font-semibold">{step === 'register' ? 'เข้าสู่ระบบ' : 'ลงทะเบียน'}</button>
        </p>
      </div>

      <button
        onClick={() => setStep('selection')}
        className="mt-4 sm:mt-5 text-gray-400 hover:text-faith-gold text-xs sm:text-sm w-full transition-all font-semibold"
      >
        ← กลับหน้าหลัก
      </button>
    </motion.div>
  );
}

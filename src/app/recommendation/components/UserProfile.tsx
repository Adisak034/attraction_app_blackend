// =============================================================================
// components/UserProfile.tsx
// =============================================================================
// หน้าต่าง Modal สำหรับแสดงข้อมูลโปรไฟล์ของผู้ใช้งาน
//
// ความสามารถหลัก:
//   - แสดงชื่อผู้ใช้ (Username) และสถิติต่างๆ เช่น จำนวนการรีวิวสถานที่
//   - ดึงข้อมูลสถิติการรีวิวจาก API (/api/rating/user/:id)
//   - ปุ่มกดเปลี่ยนรหัสผ่านใหม่ (Change Password) พร้อม Validation
//   - ใช้ ModalFrame ร่วมกันเพื่อลดโค้ดซ้ำซ้อน
// =============================================================================

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Trophy,
  User,
} from 'lucide-react';
import { apiGet, apiPut } from '@/lib/apiClient';
import ModalFrame from './shared/ModalFrame';

// =============================================================================
// Types
// =============================================================================

interface UserProfileProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

// =============================================================================
// Sub-Component: ProfileStatRow
// =============================================================================

interface ProfileStatRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  delay?: number;
}

function ProfileStatRow({ icon, label, value, delay = 0 }: ProfileStatRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="bg-black/20 border border-white/5 rounded-xl p-3"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-faith-gold shrink-0">{icon}</div>
        <span className="text-[10px] sm:text-xs font-semibold text-gray-400">{label}</span>
      </div>
      <div>{value}</div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function UserProfile({ userId, userName, onBack }: UserProfileProps) {
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Change Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    const fetchRatingStats = async () => {
      try {
        setLoading(true);
        const ratings = (await apiGet(`/api/rating/user/${userId}`)) as unknown[];
        setRatingCount(ratings?.length || 0);
      } catch (error) {
        console.error('Failed to fetch rating stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      void fetchRatingStats();
    }
  }, [userId]);

  const resetPasswordForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setIsChangingPassword(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const pw = newPassword.trim();
    if (pw.length < 8 || !/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) {
      setPasswordError('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวอักษรพิมพ์เล็กและพิมพ์ใหญ่');
      return;
    }

    if (pw !== confirmPassword) {
      setPasswordError('รหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }

    try {
      setPasswordLoading(true);
      await apiPut(`/api/users/${userId}`, { password: pw });
      setPasswordSuccess('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        resetPasswordForm();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasswordError(`เปลี่ยนรหัสผ่านไม่สำเร็จ (${msg})`);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <ModalFrame
      title={isChangingPassword ? 'เปลี่ยนรหัสผ่าน' : 'ข้อมูลผู้ใช้'}
      subtitle={isChangingPassword ? 'ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ' : `รหัสของคุณ: ${userId}`}
      icon={isChangingPassword ? <KeyRound size={20} /> : <User size={20} />}
      onClose={isChangingPassword ? resetPasswordForm : onBack}
      maxWidthClassName="max-w-md"
    >
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        {!isChangingPassword ? (
          <motion.div
            key="profile-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#2D0A0A] border border-white/15 rounded-2xl p-4 sm:p-5 shadow-md space-y-4"
          >
            {/* Avatar Circle */}
            <div className="flex justify-center py-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-16 h-16 bg-gradient-to-br from-faith-gold/50 to-faith-gold/20 rounded-full flex items-center justify-center border-2 border-faith-gold shadow-[0_0_30px_rgba(212,175,55,0.3)]"
              >
                <User size={28} className="text-faith-gold" />
              </motion.div>
            </div>

            {/* Stat Rows */}
            <div className="space-y-3">
              <ProfileStatRow
                icon={<User size={14} />}
                label="ชื่อผู้ใช้"
                value={<p className="text-sm sm:text-xl font-black text-white break-words">{userName}</p>}
                delay={0.15}
              />

              <ProfileStatRow
                icon={<Mail size={14} />}
                label="ID ผู้ใช้"
                value={<p className="text-xs sm:text-sm font-mono text-gray-200 break-all">{userId}</p>}
                delay={0.2}
              />

              <ProfileStatRow
                icon={<Trophy size={14} />}
                label="จำนวนรีวิว"
                value={
                  loading ? (
                    <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                  ) : (
                    <p className="text-sm sm:text-xl font-black text-faith-gold">{ratingCount} รีวิว</p>
                  )
                }
                delay={0.25}
              />
            </div>

            {/* Change Password Button */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  setIsChangingPassword(true);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                className="w-full bg-faith-gold/20 hover:bg-faith-gold/30 border border-faith-gold/50 hover:border-faith-gold text-faith-gold py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <KeyRound size={16} />
                <span>เปลี่ยนรหัสผ่าน</span>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="password-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#2D0A0A] border border-white/15 rounded-2xl p-4 sm:p-5 shadow-md space-y-4"
          >
            {/* Back to Profile Button */}
            <button
              type="button"
              onClick={resetPasswordForm}
              className="text-xs text-gray-400 hover:text-faith-gold flex items-center gap-1.5 font-semibold transition-colors"
            >
              <ArrowLeft size={14} />
              <span>ย้อนกลับไปหน้าข้อมูลผู้ใช้</span>
            </button>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-faith-gold/80 pl-1">
                  รหัสผ่านใหม่
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่"
                    className="w-full text-xs sm:text-sm bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-10 focus:border-faith-gold transition-all outline-none text-white placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-faith-gold transition-colors p-1"
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 pl-1 leading-relaxed">
                  รหัสผ่านอย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรพิมพ์เล็กและพิมพ์ใหญ่
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-faith-gold/80 pl-1">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                    className="w-full text-xs sm:text-sm bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-10 focus:border-faith-gold transition-all outline-none text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Error & Success Messages */}
              {passwordError && (
                <p className="text-red-400 text-xs text-center font-bold bg-red-950/40 py-2.5 rounded-xl border border-red-900/50">
                  {passwordError}
                </p>
              )}

              {passwordSuccess && (
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs text-center font-bold bg-emerald-950/40 py-2.5 rounded-xl border border-emerald-900/50">
                  <CheckCircle2 size={15} />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetPasswordForm}
                  className="w-1/3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all"
                >
                  ยกเลิก
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={passwordLoading}
                  className="w-2/3 bg-faith-gold hover:bg-amber-400 text-[#1A0404] py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {passwordLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>บันทึกรหัสผ่าน</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </ModalFrame>
  );
}

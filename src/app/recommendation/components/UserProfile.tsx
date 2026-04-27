import { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Trophy, Lock, Check, AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiGet, apiPut } from '@/lib/apiClient';

interface UserProfileProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

export default function UserProfile({ userId, userName, onBack }: UserProfileProps) {
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newUserName, setNewUserName] = useState(userName);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchRatingStats = async () => {
      try {
        const ratings = await apiGet(`/api/rating/user/${userId}`);
        setRatingCount(ratings.length || 0);
      } catch (error) {
        console.error('Failed to fetch rating stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchRatingStats();
    }
  }, [userId]);

  const handleSaveChanges = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!newUserName.trim()) {
      setError('ชื่อผู้ใช้ไม่สามารถเว้นว่างได้');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = { user_name: newUserName };
      if (newPassword) {
        updateData.password = newPassword;
      }

      await apiPut(`/api/users/${userId}`, updateData);
      setSuccess('บันทึกข้อมูลสำเร็จ');
      setIsEditing(false);
      setNewPassword('');
      setConfirmPassword('');

      // Update localStorage
      localStorage.setItem('faith_userName', newUserName);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('การบันทึกข้อมูลล้มเหลว กรุณาลองใหม่');
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Overlay Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onBack}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <motion.div
          className="bg-[#1A0404] border border-faith-gold/20 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 z-50 bg-[#1A0404] border-b border-faith-gold/10 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-faith-gold">ข้อมูลผู้ใช้</h2>
            <button
              onClick={onBack}
              className="p-1 hover:bg-faith-gold/10 rounded-lg transition-colors text-faith-gold"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollbar Hide CSS */}
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          {/* Content */}
          <div className="px-4 sm:px-6 py-4 space-y-4 sm:space-y-6 overflow-y-auto flex-1 scrollbar-hide">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-[#2A1010] via-[#1A0404] to-[#0F0202] border border-faith-gold/30 rounded-2xl p-3 sm:p-6 md:p-8 shadow-2xl"
            >
        {/* User Avatar Circle */}
        <div className="flex justify-center mb-4 sm:mb-8">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-16 sm:w-24 h-16 sm:h-24 bg-gradient-to-br from-faith-gold/50 to-faith-gold/20 rounded-full flex items-center justify-center border-2 border-faith-gold shadow-[0_0_30px_rgba(212,175,55,0.3)]"
          >
            <User size={32} className="text-faith-gold" />
          </motion.div>
        </div>

        {/* User Information */}
        <div className="space-y-3 sm:space-y-5 md:space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 sm:p-4 flex items-start gap-2 sm:gap-3"
            >
              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-red-300 text-xs sm:text-sm break-words leading-snug">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/20 border border-green-500/50 rounded-lg p-2 sm:p-4 flex items-start gap-2 sm:gap-3"
            >
              <Check size={14} className="text-green-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-green-300 text-xs sm:text-sm break-words leading-snug">{success}</p>
            </motion.div>
          )}

          {/* Username */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-faith-gold/20 rounded-lg p-2 sm:p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <User size={14} className="text-faith-gold flex-shrink-0" />
              <span className="text-[10px] sm:text-sm font-semibold text-gray-400">ชื่อผู้ใช้</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full bg-[#1A0404] border border-faith-gold/30 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-base text-white focus:outline-none focus:border-faith-gold focus:ring-1 focus:ring-faith-gold/50 min-h-[40px] sm:min-h-[40px]"
                placeholder="ชื่อผู้ใช้ใหม่"
              />
            ) : (
              <p className="text-sm sm:text-2xl font-black text-white break-words">{newUserName}</p>
            )}
          </motion.div>

          {/* User ID */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border border-faith-gold/20 rounded-lg p-2 sm:p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Mail size={14} className="text-faith-gold flex-shrink-0" />
              <span className="text-[10px] sm:text-sm font-semibold text-gray-400">ID ผู้ใช้</span>
            </div>
            <p className="text-xs sm:text-xl font-mono text-gray-200 break-all">{userId}</p>
          </motion.div>

          {/* Password - Only show when editing */}
          {isEditing && (
            <>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 border border-faith-gold/20 rounded-lg p-2 sm:p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={14} className="text-faith-gold flex-shrink-0" />
                  <span className="text-[10px] sm:text-sm font-semibold text-gray-400">รหัสผ่านใหม่</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#1A0404] border border-faith-gold/30 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-base text-white focus:outline-none focus:border-faith-gold focus:ring-1 focus:ring-faith-gold/50 pr-10 min-h-[40px] sm:min-h-[40px]"
                    placeholder="กรุณาป้อนรหัสผ่านใหม่"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-faith-gold hover:text-amber-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-white/5 border border-faith-gold/20 rounded-lg p-2 sm:p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={14} className="text-faith-gold flex-shrink-0" />
                  <span className="text-[10px] sm:text-sm font-semibold text-gray-400">ยืนยันรหัสผ่าน</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#1A0404] border border-faith-gold/30 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-base text-white focus:outline-none focus:border-faith-gold focus:ring-1 focus:ring-faith-gold/50 pr-10 min-h-[40px] sm:min-h-[40px]"
                    placeholder="ยืนยันรหัสผ่านใหม่"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-faith-gold hover:text-amber-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>
            </>
          )}

          {/* Statistics */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 border border-faith-gold/20 rounded-lg p-2 sm:p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={14} className="text-faith-gold flex-shrink-0" />
              <span className="text-[10px] sm:text-sm font-semibold text-gray-400">จำนวนรีวิว</span>
            </div>
            <div>
              {loading ? (
                <p className="text-gray-400 text-xs sm:text-sm">กำลังโหลด...</p>
              ) : (
                <p className="text-sm sm:text-2xl font-black text-faith-gold">{ratingCount} รีวิว</p>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-4 sm:mt-8 pt-4 sm:pt-8 border-t border-faith-gold/20 flex flex-col gap-2 sm:gap-3"
      >
        <p className="text-[10px] sm:text-sm text-gray-400 mb-1 sm:mb-2">การดำเนินการ</p>
        {isEditing ? (
          <div className="flex flex-col gap-2 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveChanges}
              disabled={saving}
              className="w-full px-3 sm:px-6 py-2.5 sm:py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all disabled:cursor-not-allowed min-h-[40px] sm:min-h-[48px] flex items-center justify-center"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setIsEditing(false);
                setNewUserName(userName);
                setNewPassword('');
                setConfirmPassword('');
                setError('');
                setSuccess('');
              }}
              className="w-full px-3 sm:px-6 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all min-h-[40px] sm:min-h-[48px] flex items-center justify-center"
            >
              ยกเลิก
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEditing(true)}
              className="w-full px-3 sm:px-6 py-2.5 sm:py-3 bg-faith-gold hover:bg-amber-400 text-[#1A0404] rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all min-h-[40px] sm:min-h-[48px] flex items-center justify-center"
            >
              แก้ไขข้อมูล
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBack}
              className="w-full px-3 sm:px-6 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all min-h-[40px] sm:min-h-[48px] flex items-center justify-center"
            >
              ย้อนกลับ
            </motion.button>
          </div>
        )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
